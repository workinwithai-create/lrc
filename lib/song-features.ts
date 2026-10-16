import type { LrcLine } from './lrc-timing';

export type SongSection = { label: string; start: number; end: number; lines: LrcLine[] };
export type HookCandidate = { start: number; end: number; label: string; score: number; excerpt: string };
const SECTION_RE = /^\[(intro|verse|pre.?chorus|chorus|refrain|bridge|outro|hook|instrumental|solo|post.?chorus|interlude)([^\]]*)\]$/i;
const MIN_HOOK = 15, MAX_HOOK = 30;

export function lyricLines(lines: readonly LrcLine[]): LrcLine[] {
  return lines.filter(line => line.text.trim() && !/^\[[^\]]+\]$/.test(line.text.trim()));
}
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

/** Prefer explicit [Verse]/[Chorus] markers. If absent, group by repeated blocks and long lyric gaps. */
export function detectSections(input: readonly LrcLine[], durationSeconds?: number): SongSection[] {
  const out: SongSection[] = [];
  const songEnd = Math.max(durationSeconds || 0, (input.at(-1)?.seconds || 0) + 3);
  let current: SongSection | null = null;
  let number = 0;
  for (const line of input) {
    const text = line.text.trim();
    const match = SECTION_RE.exec(text);
    const gap = current?.lines.length ? line.seconds - current.lines[current.lines.length - 1].seconds : 0;
    if (match || !current || (!match && gap > 9 && current.lines.length > 1)) {
      if (current) { current.end = line.seconds; out.push(current); }
      number += 1;
      const label = match ? (match[1] + match[2]).trim() : `Section ${number}`;
      current = { label, start: line.seconds, end: songEnd, lines: [] };
      if (match) continue;
    }
    if (current && text && !/^\[[^\]]+\]$/.test(text)) current.lines.push(line);
  }
  if (current) { current.end = songEnd; out.push(current); }
  if (!out.length) return [];
  const counts = new Map<string, number>();
  for (const line of lyricLines(input)) {
    const key = normalize(line.text);
    if (key.length > 7) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return out.map(section => {
    if (!/^Section \d+$/.test(section.label)) return section;
    const repeated = section.lines.filter(line => (counts.get(normalize(line.text)) || 0) > 1).length;
    if (section.lines.length && repeated / section.lines.length >= .6) return { ...section, label: 'Repeated refrain' };
    return section;
  });
}

/** Rank candidate hooks using repetition, chorus markers and lyric density, not ungrounded AI claims. */
export function detectHooks(lines: readonly LrcLine[], durationSeconds?: number): HookCandidate[] {
  const words = lyricLines(lines);
  if (!words.length) return [];
  const sections = detectSections(lines, durationSeconds);
  const count = new Map<string, number>();
  words.forEach(w => {
    const k = normalize(w.text);
    if (k) count.set(k, (count.get(k) || 0) + 1);
  });
  const endTime = Math.max(durationSeconds || 0, words.at(-1)!.seconds + 5);
  const candidates: HookCandidate[] = [];
  for (let i = 0; i < words.length; i++) {
    const start = words[i].seconds;
    const end = Math.min(endTime, start + 25);
    if (end - start < MIN_HOOK) continue;
    const within = words.filter(w => w.seconds >= start && w.seconds < end);
    if (!within.length) continue;
    const repeat = within.filter(w => (count.get(normalize(w.text)) || 0) >= 2).length;
    const section = sections.find(s => s.start <= start && s.end > start);
    const chorus = /chorus|refrain|hook/i.test(section?.label || '');
    const density = Math.min(within.length, 9);
    const score = density + repeat * 2.2 + (chorus ? 12 : 0);
    candidates.push({ start, end, score, label: chorus ? 'Chorus candidate' : repeat > 1 ? 'Repeated hook' : 'Lyric moment', excerpt: within.slice(0, 2).map(w => w.text).join(' / ') });
  }
  return candidates.sort((a,b) => b.score - a.score || a.start - b.start)
    .filter((v,i,arr) => arr.findIndex(o => Math.abs(o.start - v.start) < 8) === i)
    .slice(0,5);
}

export function timedKaraokeLine(lines: readonly LrcLine[], at: number): {index: number; text: string; start: number; end: number; fraction: number} | null {
  const spoken = lyricLines(lines);
  const index = spoken.reduce((last, line, i) => line.seconds <= at ? i : last, -1);
  if(index < 0) return null;
  const start = spoken[index].seconds;
  const end = Math.max(start + .2, spoken[index + 1]?.seconds ?? start + Math.max(2, spoken[index].text.length * .07));
  return { index, text: spoken[index].text, start, end, fraction: Math.max(0,Math.min(1,(at-start)/(end-start))) };
}

export type TapResult = { expected: number; actual: number; difference: number; verdict: 'early'|'late'|'on-time' };
export function scoreTappedEntries(expected: readonly number[], actual: readonly number[]): TapResult[] {
  return actual.slice(0,expected.length).map((at,i) => {
    const difference = Math.round((at - expected[i]) * 100) / 100;
    return { expected: expected[i], actual: at, difference, verdict: difference < -.15 ? 'early' : difference > .15 ? 'late' : 'on-time' };
  });
}
