/** Derive lyric-writing intervals from line-level LRC timestamps.
 * The offset is signed: negative = write ahead of the vocal, positive = behind it.
 * Times are based on the media playback clock, not timers, so pause/seek never drift.
 */
export type WritingLine = { seconds: number; text: string };

export function writingOffsetLabel(offset: number): string {
  if (Math.abs(offset) < 0.005) return 'With the vocal · 0.0s';
  return offset < 0
    ? `Ahead of the vocal · ${Math.abs(offset).toFixed(1)}s`
    : `Behind the vocal · ${offset.toFixed(1)}s`;
}

export function getWritingInterval(
  lines: readonly WritingLine[],
  index: number,
  offsetSeconds = 0,
  penPace = 1,
  audioDuration?: number
): { start: number; duration: number } {
  const line = lines[index];
  if (!line) return { start: 0, duration: 1 };

  const offset = Number.isFinite(offsetSeconds) ? offsetSeconds : 0;
  const pace = Math.max(0.6, Math.min(1.8, Number.isFinite(penPace) ? penPace : 1));
  const start = Math.max(0, line.seconds + offset);
  const next = lines[index + 1];
  // The next lyric's onset is a hard deadline: never have two pens writing at once.
  const nextStart = next ? Math.max(0, next.seconds + offset) : undefined;
  const trailingEnd = Number.isFinite(audioDuration) && audioDuration! > start
    ? audioDuration!
    : start + Math.max(2.6, line.text.length * 0.09);
  const end = nextStart ?? trailingEnd;
  const window = Math.max(0.08, end - start - (next ? 0.04 : 0));
  // Length-based natural pace, sped up to fit short phrases when necessary.
  const natural = Math.max(0.55, Math.min(6, line.text.length * 0.07 / pace));
  return { start, duration: Math.min(natural, window) };
}

export function handwritingFraction(time: number, start: number, duration: number) {
  if (time < start) return 0;
  return Math.max(0, Math.min(1, (time - start) / Math.max(0.08, duration)));
}
