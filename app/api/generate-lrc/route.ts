import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

type WhisperWord = { word: string; start: number; end: number };
type DeepgramWord = { word: string; start: number; end: number; confidence: number };
type TimedLine = { line: string; seconds: number };

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // --- AUTH ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // --- CHECK CREDITS / SUBSCRIPTION ---
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAdmin = profile.is_admin === true;
    const hasActiveSub = profile.subscription_status === 'active';
    const hasMonthlyQuota = hasActiveSub && profile.monthly_quota_remaining > 0;
    const hasCredits = profile.credits > 0;

    if (!isAdmin && !hasMonthlyQuota && !hasCredits) {
      return NextResponse.json(
        {
          error: 'Out of credits',
          code: 'NO_CREDITS',
          message: 'You have no songs left. Subscribe or buy a pack to continue.',
        },
        { status: 402 }
      );
    }

    // --- PARSE FORM ---
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const lyricsRaw = (formData.get('lyrics') as string) || '';
    const mode = (formData.get('mode') as string) || 'smart';
    const title = (formData.get('title') as string) || 'Untitled';
    const artist = (formData.get('artist') as string) || 'Unknown Artist';

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 413 });
    }

    if (mode === 'smart' && !lyricsRaw.trim()) {
      return NextResponse.json(
        { error: 'Lyrics required for smart alignment' },
        { status: 400 }
      );
    }

    // Buffer audio once — shared between Whisper and Deepgram
    const audioBuffer = await audioFile.arrayBuffer();
    const audioForWhisper = new File([audioBuffer], audioFile.name, { type: audioFile.type });

    // --- TRANSCRIBE: Whisper + Deepgram in parallel ---
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const [whisperResult, deepgramWords] = await Promise.all([
      openai.audio.transcriptions.create({
        file: audioForWhisper,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      }),
      transcribeWithDeepgram(audioBuffer, audioFile.type),
    ]);

    const whisperWords: WhisperWord[] = whisperResult.words || [];

    if (whisperWords.length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in audio.' },
        { status: 422 }
      );
    }

    // Merge Deepgram timestamps into Whisper words when confident
    const mergedWords = mergeWordTimestamps(whisperWords, deepgramWords);

    // --- BUILD TIMED LINES ---
    let timedLines: TimedLine[];
    if (mode === 'strict') {
      timedLines = groupWordsIntoLines(mergedWords);
    } else {
      timedLines = alignLyricsToWords(parseLyrics(lyricsRaw), mergedWords);
    }

    const duration = whisperResult.duration || getLastWordEnd(mergedWords);
    const lrcContent = buildLRC({ title, artist, durationSec: duration, lines: timedLines });

    // --- DECREMENT QUOTA (skip for admin) ---
    if (!isAdmin) {
      if (hasMonthlyQuota) {
        await supabase
          .from('profiles')
          .update({ monthly_quota_remaining: profile.monthly_quota_remaining - 1 })
          .eq('id', user.id);
      } else {
        await supabase
          .from('profiles')
          .update({ credits: profile.credits - 1 })
          .eq('id', user.id);
      }
    }

    // --- SAVE SONG ---
    const { data: song } = await supabase
      .from('songs')
      .insert({
        user_id: user.id,
        title,
        artist,
        duration_seconds: duration,
        mode,
        lrc_content: lrcContent,
        word_count: mergedWords.length,
        line_count: timedLines.length,
      })
      .select()
      .single();

    // --- LOG USAGE ---
    const deepgramUsed = deepgramWords.length > 0;
    await supabase.from('usage_log').insert({
      user_id: user.id,
      action: 'generate_lrc',
      metadata: { song_id: song?.id, mode, duration, deepgram_used: deepgramUsed },
      cost_cents: Math.ceil((duration / 60) * 0.6),
    });

    const creditsRemaining = isAdmin
      ? null  // null = unlimited
      : hasMonthlyQuota
        ? profile.monthly_quota_remaining - 1
        : profile.credits - 1;

    return NextResponse.json({
      success: true,
      lrc: lrcContent,
      wordCount: mergedWords.length,
      lineCount: timedLines.length,
      duration,
      mode,
      songId: song?.id,
      creditsRemaining,
      deepgramUsed,
    });
  } catch (err: any) {
    console.error('LRC generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------- Deepgram ----------

async function transcribeWithDeepgram(audioBuffer: ArrayBuffer, mimeType: string): Promise<DeepgramWord[]> {
  if (!process.env.DEEPGRAM_API_KEY) return [];
  try {
    const { createClient } = await import('@deepgram/sdk');
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      Buffer.from(audioBuffer),
      { model: 'nova-2', smart_format: false, punctuate: false, mimetype: mimeType }
    );
    if (error) return [];
    return result?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
  } catch {
    return [];
  }
}

// ---------- Timestamp merging ----------

function mergeWordTimestamps(whisperWords: WhisperWord[], dgWords: DeepgramWord[]): WhisperWord[] {
  if (dgWords.length === 0) return whisperWords;

  const normWord = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const dgNorm = dgWords.map(w => ({ ...w, norm: normWord(w.word) }));

  return whisperWords.map((w, i) => {
    const wNorm = normWord(w.word);
    const searchStart = Math.max(0, i - 3);
    const searchEnd = Math.min(dgNorm.length, i + 4);

    let best: DeepgramWord | null = null;
    let bestConfidence = 0;

    for (let j = searchStart; j < searchEnd; j++) {
      const dg = dgNorm[j];
      const isMatch = dg.norm === wNorm || dg.norm.includes(wNorm) || wNorm.includes(dg.norm);
      if (!isMatch) continue;
      const timeDiff = Math.abs(dg.start - w.start);
      if (timeDiff < 1.0 && dgWords[j].confidence > bestConfidence) {
        best = dgWords[j];
        bestConfidence = dgWords[j].confidence;
      }
    }

    // Only merge when Deepgram is confident (>70%) — otherwise trust Whisper alone
    if (best && bestConfidence > 0.7) {
      return {
        word: w.word,
        start: (w.start + best.start) / 2,
        end: (w.end + best.end) / 2,
      };
    }

    return w;
  });
}

// ---------- Helpers ----------

function parseLyrics(raw: string): string[] {
  return raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
}

function getLastWordEnd(words: WhisperWord[]): number {
  return words.length > 0 ? words[words.length - 1].end : 0;
}

function groupWordsIntoLines(words: WhisperWord[]): TimedLine[] {
  const lines: TimedLine[] = [];
  let current: WhisperWord[] = [];
  const PAUSE = 0.8;
  const MAX = 10;

  for (let i = 0; i < words.length; i++) {
    current.push(words[i]);
    const next = words[i + 1];
    const gap = next ? next.start - words[i].end : Infinity;
    if (gap > PAUSE || current.length >= MAX || !next) {
      lines.push({
        line: current.map(x => x.word.trim()).join(' ').trim(),
        seconds: current[0].start,
      });
      current = [];
    }
  }
  return lines;
}

function alignLyricsToWords(userLines: string[], words: WhisperWord[]): TimedLine[] {
  const isMarker = (l: string) => /^\[.+\]$/.test(l.trim());
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const COMMON = new Set(['i','a','the','and','or','but','in','on','at','to','of','is','it',
    'you','my','me','we','he','she','so','do','be','as','if','by','up','no','oh',
    'yeah','ooh','ah','uh','mm','na','la','hey','now','just','got','get','go','all']);

  const wNorm = words.map(w => ({ ...w, norm: norm(w.word) }));
  const totalDuration = getLastWordEnd(words);

  // Pre-compute expected time for each line based on proportional position
  const contentCount = userLines.filter(l => !isMarker(l)).length;
  let contentIdx = 0;
  const expectedTimes: number[] = userLines.map(l => {
    if (isMarker(l)) return -1;
    const t = (contentIdx / Math.max(contentCount - 1, 1)) * totalDuration;
    contentIdx++;
    return t;
  });

  // Each line searches within ±20% of song duration around its expected time
  const WINDOW = totalDuration * 0.20;

  function getAnchors(line: string): string[] {
    const parts = line.split(/\s+/).map(norm);
    const strong = parts.slice(0, 5).filter(w => w.length >= 3 && !COMMON.has(w));
    if (strong.length > 0) return strong.slice(0, 2);
    return parts.slice(0, 3).filter(w => w.length >= 2);
  }

  function scoreAt(lineNorm: string[], j: number): number {
    let score = 0;
    let k = j;
    for (let li = 0; li < Math.min(lineNorm.length, 5); li++) {
      const t = lineNorm[li];
      if (t.length < 2) continue;
      if (COMMON.has(t)) { score += 0.2; continue; }
      let hit = false;
      for (let kk = k; kk < Math.min(k + 5, wNorm.length); kk++) {
        const wn = wNorm[kk].norm;
        if (wn === t || (t.length >= 4 && (wn.startsWith(t.slice(0, -1)) || t.startsWith(wn.slice(0, -1))))) {
          score += 1;
          k = kk + 1;
          hit = true;
          break;
        }
      }
      if (!hit && li === 0) return 0;
    }
    return score;
  }

  // Find first whisper word index at or after a given time
  function idxAtTime(t: number): number {
    for (let j = 0; j < wNorm.length; j++) {
      if (wNorm[j].start >= t) return j;
    }
    return wNorm.length;
  }

  type MaybeTimedLine = { line: string; seconds: number; matched: boolean };
  const result: MaybeTimedLine[] = [];
  let searchFrom = 0;

  // --- PASS 1: find confident matches within expected time window ---
  for (let i = 0; i < userLines.length; i++) {
    const line = userLines[i];

    if (isMarker(line)) {
      result.push({ line, seconds: -1, matched: false });
      continue;
    }

    const lineNorm = line.split(/\s+/).map(norm);
    const anchors = getAnchors(line);

    if (anchors.length === 0) {
      result.push({ line, seconds: -1, matched: false });
      continue;
    }

    const expectedTime = expectedTimes[i];
    // Search from max(searchFrom, window start) to window end
    const windowStart = Math.max(0, expectedTime - WINDOW);
    const windowEnd = expectedTime + WINDOW;
    const jStart = Math.max(searchFrom, idxAtTime(windowStart));
    const jEnd = Math.min(wNorm.length, idxAtTime(windowEnd) + 5);

    let bestIdx = -1;
    let bestScore = 0;

    for (let j = jStart; j < jEnd; j++) {
      const wn = wNorm[j].norm;
      const isAnchor = anchors.some(a =>
        wn === a || (a.length >= 4 && (wn.startsWith(a.slice(0, -1)) || a.startsWith(wn.slice(0, -1))))
      );
      if (!isAnchor) continue;

      const score = scoreAt(lineNorm, j);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = j;
        if (bestScore >= 2) break;
      }
    }

    if (bestIdx !== -1 && bestScore >= 1) {
      result.push({ line, seconds: wNorm[bestIdx].start, matched: true });
      searchFrom = bestIdx + 1;
    } else {
      result.push({ line, seconds: -1, matched: false });
    }
  }

  // --- PASS 2: interpolate unmatched lines between bracketing matched neighbors ---
  let i = 0;
  while (i < result.length) {
    if (result[i].seconds >= 0 || isMarker(result[i].line)) { i++; continue; }

    // Collect the run of unmatched non-marker lines
    let runEnd = i;
    while (runEnd < result.length && result[runEnd].seconds < 0 && !isMarker(result[runEnd].line)) {
      runEnd++;
    }

    // Find bracketing matched seconds
    let prevSec = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (result[j].seconds >= 0 && !isMarker(result[j].line)) { prevSec = result[j].seconds; break; }
    }
    let nextSec = totalDuration;
    for (let j = runEnd; j < result.length; j++) {
      if (result[j].seconds >= 0 && !isMarker(result[j].line)) { nextSec = result[j].seconds; break; }
    }

    const count = runEnd - i;
    const step = (nextSec - prevSec) / (count + 1);
    for (let k = 0; k < count; k++) {
      result[i + k].seconds = prevSec + step * (k + 1);
    }
    i = runEnd;
  }

  // Place section markers just before the next real line
  for (let idx = 0; idx < result.length; idx++) {
    if (!isMarker(result[idx].line)) continue;
    let ref = -1;
    for (let j = idx + 1; j < result.length; j++) {
      if (result[j].seconds >= 0 && !isMarker(result[j].line)) { ref = result[j].seconds; break; }
    }
    if (ref < 0) {
      for (let j = idx - 1; j >= 0; j--) {
        if (result[j].seconds >= 0) { ref = result[j].seconds + 2; break; }
      }
    }
    result[idx].seconds = Math.max((ref >= 0 ? ref : 0) - 1.0, 0);
  }

  // Monotonic fix — timestamps must always move forward
  for (let idx = 1; idx < result.length; idx++) {
    if (result[idx].seconds < result[idx - 1].seconds) {
      result[idx].seconds = result[idx - 1].seconds + 0.2;
    }
  }

  return result.map(({ line, seconds }) => ({ line, seconds }));
}

function toTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `[${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}]`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildLRC({
  title,
  artist,
  durationSec,
  lines,
}: {
  title: string;
  artist: string;
  durationSec: number;
  lines: TimedLine[];
}): string {
  let lrc = '';
  lrc += `[ti:${title}]\n`;
  lrc += `[ar:${artist}]\n`;
  lrc += `[length:${formatDuration(durationSec)}]\n`;
  lrc += `[tool:LRC Forge]\n\n`;
  for (const item of lines) {
    lrc += `${toTimestamp(item.seconds)}${item.line}\n`;
  }
  return lrc;
}
