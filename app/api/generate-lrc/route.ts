import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient, createAdmin } from '@/lib/supabase/server';
import { AUDIO_UPLOAD_BUCKET, MAX_AUDIO_BYTES } from '@/lib/audio-storage';
import { hasUnlimitedAccess } from '@/lib/owner-access';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

type WhisperWord = { word: string; start: number; end: number };
type DeepgramWord = { word: string; start: number; end: number; confidence: number };
type TimedLine = { line: string; seconds: number };

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

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

    const isAdmin = hasUnlimitedAccess(profile, user.email);
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
    const audioPath = (formData.get('audioPath') as string) || '';
    const audioName = (formData.get('audioName') as string) || 'audio';
    const audioType = (formData.get('audioType') as string) || 'audio/mpeg';
    const lyricsRaw = (formData.get('lyrics') as string) || '';
    const mode = (formData.get('mode') as string) || 'smart';
    const title = (formData.get('title') as string) || 'Untitled';
    const artist = (formData.get('artist') as string) || 'Unknown Artist';
    const offsetSeconds = parseFloat((formData.get('offset') as string) || '0') || 0;

    if (!audioFile && !audioPath) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (audioFile && audioFile.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 413 });
    }

    if (mode === 'smart' && !lyricsRaw.trim()) {
      return NextResponse.json(
        { error: 'Lyrics required for smart alignment' },
        { status: 400 }
      );
    }

    // Buffer audio once - shared between Whisper and Deepgram.
    const { audioBuffer, fileName, mimeType } = audioFile
      ? {
          audioBuffer: await audioFile.arrayBuffer(),
          fileName: audioFile.name,
          mimeType: audioFile.type || 'audio/mpeg',
        }
      : await getUploadedAudio(audioPath, user.id, audioName, audioType);

    if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 413 });
    }

    const audioForWhisper = new File([audioBuffer], fileName, { type: mimeType });

    // --- TRANSCRIBE: Whisper + Deepgram in parallel ---
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const [whisperResult, deepgramWords] = await Promise.all([
      openai.audio.transcriptions.create({
        file: audioForWhisper,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['word'],
      }),
      transcribeWithDeepgram(audioBuffer, mimeType),
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
    const lrcContent = buildLRC({ title, artist, durationSec: duration, lines: timedLines, offsetSeconds });

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

async function getUploadedAudio(
  audioPath: string,
  userId: string,
  fallbackName: string,
  fallbackType: string
) {
  if (!audioPath.startsWith(`${userId}/`)) {
    throw new Error('Invalid audio upload path');
  }

  const admin = createAdmin();
  const { data, error } = await admin.storage
    .from(AUDIO_UPLOAD_BUCKET)
    .download(audioPath);

  if (error || !data) {
    throw new Error(error?.message || 'Could not read uploaded audio');
  }

  const audioBuffer = await data.arrayBuffer();
  await admin.storage.from(AUDIO_UPLOAD_BUCKET).remove([audioPath]);

  return {
    audioBuffer,
    fileName: fallbackName || audioPath.split('/').pop() || 'audio',
    mimeType: data.type || fallbackType || 'audio/mpeg',
  };
}

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

  const totalDuration = getLastWordEnd(words);
  const whisperNorm = words.map(w => ({ ...w, norm: norm(w.word) }));

  // Flatten lyric lines into words, recording which line each word came from
  const lyricWords: { word: string; lineIdx: number }[] = [];
  for (let i = 0; i < userLines.length; i++) {
    if (isMarker(userLines[i])) continue;
    for (const raw of userLines[i].split(/\s+/)) {
      const w = norm(raw);
      if (w.length >= 1) lyricWords.push({ word: w, lineIdx: i });
    }
  }

  const N = lyricWords.length;
  const M = whisperNorm.length;

  // Score how well a lyric word matches a Whisper word
  function matchScore(lw: string, ww: string): number {
    if (!lw || !ww) return -1;
    if (lw === ww) return COMMON.has(lw) ? 0.5 : 2.0;
    if (lw.length >= 4 && ww.length >= 4) {
      if (lw.startsWith(ww.slice(0, -1)) || ww.startsWith(lw.slice(0, -1))) return 1.5;
    }
    return -1;
  }

  // Global sequence alignment (Needleman-Wunsch) — handles repeated sections correctly
  // because both lyric text and Whisper output contain each chorus twice in sequence.
  const GAP_LYRIC = -0.5;    // penalty for a lyric word Whisper didn't transcribe
  const GAP_WHISPER = -0.3;  // penalty for a Whisper word not in the lyrics (filler/noise)

  const lyricToWhisper = new Map<number, number>();

  if (N > 0 && M > 0 && N * M <= 600_000) {
    const W = M + 1;
    const dp = new Float32Array((N + 1) * W);
    const trace = new Uint8Array((N + 1) * W); // 0=align, 1=skip lyric, 2=skip whisper

    for (let i = 0; i <= N; i++) { dp[i * W] = i * GAP_LYRIC; trace[i * W] = 1; }
    for (let j = 0; j <= M; j++) { dp[j] = j * GAP_WHISPER; trace[j] = 2; }
    trace[0] = 0;

    for (let i = 1; i <= N; i++) {
      for (let j = 1; j <= M; j++) {
        const ms = matchScore(lyricWords[i - 1].word, whisperNorm[j - 1].norm);
        const diag    = dp[(i - 1) * W + (j - 1)] + ms;
        const skipL   = dp[(i - 1) * W + j] + GAP_LYRIC;
        const skipW   = dp[i * W + (j - 1)] + GAP_WHISPER;
        if (diag >= skipL && diag >= skipW) {
          dp[i * W + j] = diag; trace[i * W + j] = 0;
        } else if (skipL >= skipW) {
          dp[i * W + j] = skipL; trace[i * W + j] = 1;
        } else {
          dp[i * W + j] = skipW; trace[i * W + j] = 2;
        }
      }
    }

    // Backtrack alignment path
    let bi = N, bj = M;
    while (bi > 0 && bj > 0) {
      const t = trace[bi * W + bj];
      if (t === 0) { lyricToWhisper.set(bi - 1, bj - 1); bi--; bj--; }
      else if (t === 1) { bi--; }
      else { bj--; }
    }
  }

  // Pre-compute each lyric word's position within its own line.
  // Used to extrapolate backward when the first matched word is mid-line.
  const lyricWordPos: number[] = [];
  {
    const seenPerLine = new Map<number, number>();
    for (let k = 0; k < N; k++) {
      const lineIdx = lyricWords[k].lineIdx;
      const pos = seenPerLine.get(lineIdx) ?? 0;
      lyricWordPos.push(pos);
      seenPerLine.set(lineIdx, pos + 1);
    }
  }

  // Average Whisper word duration — used to step back from a mid-line anchor.
  const avgWordDuration = M > 0 ? totalDuration / M : 0.4;

  // Derive line timestamps.
  // For each line, use the first matched word. If that word is the Nth word in the
  // line (not the first), extrapolate backward by N * avgWordDuration * 0.8 to
  // estimate where the line actually starts. The 0.8 factor is conservative to avoid
  // overshooting into the previous line. Also skip anchoring on a single common word
  // (score ≤ 0.5) when the match is very weak — let interpolation handle it instead.
  const lineTimestamps = new Map<number, number>();
  const lineAnchorScores = new Map<number, number>();
  for (let k = 0; k < N; k++) {
    const wi = lyricToWhisper.get(k);
    if (wi === undefined) continue;
    const lineIdx = lyricWords[k].lineIdx;
    const posInLine = lyricWordPos[k];
    const score = matchScore(lyricWords[k].word, whisperNorm[wi].norm);

    if (!lineTimestamps.has(lineIdx)) {
      // First match for this line — anchor it (possibly extrapolating back).
      const rawTime = words[wi].start;
      const lineStart = Math.max(0, rawTime - posInLine * avgWordDuration * 0.8);
      lineTimestamps.set(lineIdx, lineStart);
      lineAnchorScores.set(lineIdx, score);
    } else if (posInLine === 0 && score > (lineAnchorScores.get(lineIdx) ?? -1) + 0.5) {
      // A stronger match on the very first word of the line — upgrade the anchor.
      lineTimestamps.set(lineIdx, words[wi].start);
      lineAnchorScores.set(lineIdx, score);
    }
  }

  // Remove suspiciously weak single-word anchors for lines that have only common-word
  // matches (score ≤ 0.5). These lines are better served by interpolation.
  for (const [lineIdx, score] of lineAnchorScores) {
    if (score <= 0.5) {
      // Count how many matched words this line has — if only one weak match, drop it.
      let matchCount = 0;
      for (let k = 0; k < N; k++) {
        if (lyricWords[k].lineIdx === lineIdx && lyricToWhisper.has(k)) matchCount++;
      }
      if (matchCount <= 1) lineTimestamps.delete(lineIdx);
    }
  }

  type MaybeTimedLine = { line: string; seconds: number; matched: boolean };
  const result: MaybeTimedLine[] = userLines.map((line, i) => ({
    line,
    seconds: isMarker(line) ? -1 : (lineTimestamps.get(i) ?? -1),
    matched: !isMarker(line) && lineTimestamps.has(i),
  }));

  // Interpolate unmatched content lines between their matched neighbors
  let pi = 0;
  while (pi < result.length) {
    if (result[pi].seconds >= 0 || isMarker(result[pi].line)) { pi++; continue; }
    let runEnd = pi;
    while (runEnd < result.length && result[runEnd].seconds < 0 && !isMarker(result[runEnd].line)) {
      runEnd++;
    }
    let prevSec = 0;
    for (let j = pi - 1; j >= 0; j--) {
      if (result[j].seconds >= 0 && !isMarker(result[j].line)) { prevSec = result[j].seconds; break; }
    }
    let nextSec = totalDuration;
    for (let j = runEnd; j < result.length; j++) {
      if (result[j].seconds >= 0 && !isMarker(result[j].line)) { nextSec = result[j].seconds; break; }
    }
    const count = runEnd - pi;
    const step = (nextSec - prevSec) / (count + 1);
    for (let k = 0; k < count; k++) {
      result[pi + k].seconds = prevSec + step * (k + 1);
    }
    pi = runEnd;
  }

  // Place section markers just before the following real line
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

  // Ensure timestamps are monotonically increasing
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
  offsetSeconds = 0,
}: {
  title: string;
  artist: string;
  durationSec: number;
  lines: TimedLine[];
  offsetSeconds?: number;
}): string {
  let lrc = '';
  lrc += `[ti:${title}]\n`;
  lrc += `[ar:${artist}]\n`;
  lrc += `[length:${formatDuration(durationSec)}]\n`;
  lrc += `[tool:LRC Forge]\n\n`;
  for (const item of lines) {
    const adjusted = Math.max(0, item.seconds - offsetSeconds);
    lrc += `${toTimestamp(adjusted)}${item.line}\n`;
  }
  return lrc;
}
