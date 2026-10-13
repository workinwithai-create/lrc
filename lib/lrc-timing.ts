/** LRC parsing and correction tools. Shared between the timing editor and save API. */
export type LrcLine = { seconds: number; text: string };
export type LrcDocument = { metadata: string[]; lines: LrcLine[] };

const STAMP = /^\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\](.*)$/;
const TAG = /^\[[a-z][a-z0-9_-]*:[^\]\r\n]*\]$/i;

export function parseLrc(input: string): LrcDocument {
  const metadata: string[] = [];
  const lines: LrcLine[] = [];
  for (const raw of input.replace(/\r\n?/g, '\n').split('\n')) {
    const value = raw.trim();
    if (!value) continue;
    const match = STAMP.exec(value);
    if (match) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fraction = Number((match[3] ?? '').padEnd(3, '0')) / 1000;
      if (seconds < 60) lines.push({ seconds: minutes * 60 + seconds + fraction, text: match[4] });
    } else if (TAG.test(value)) {
      metadata.push(value);
    }
  }
  return { metadata, lines };
}

export function formatLrcTimestamp(rawSeconds: number): string {
  const hundredths = Math.round(Math.max(0, Number.isFinite(rawSeconds) ? rawSeconds : 0) * 100);
  const mm = Math.floor(hundredths / 6000);
  const ss = Math.floor((hundredths % 6000) / 100);
  const cc = hundredths % 100;
  return `[${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cc).padStart(2, '0')}]`;
}

export function serializeLrc(doc: LrcDocument): string {
  const header = doc.metadata.filter(x => TAG.test(x));
  const timed = doc.lines.map(({ seconds, text }) =>
    `${formatLrcTimestamp(seconds)}${text.replace(/[\r\n]/g, ' ')}`
  );
  return [...header, '', ...timed, ''].join('\n');
}

/** Keep the writer's original line order, even with repeated choruses and section markers. */
export function retimeLine(lines: LrcLine[], index: number, atSeconds: number): LrcLine[] {
  if (index < 0 || index >= lines.length || !Number.isFinite(atSeconds)) return lines;
  const prev = index > 0 ? lines[index - 1].seconds : 0;
  const next = index < lines.length - 1 ? lines[index + 1].seconds : Infinity;
  const lo = Math.max(0, prev + (index > 0 ? 0.01 : 0));
  const hi = Number.isFinite(next) ? Math.max(lo, next - 0.01) : Infinity;
  const changed = [...lines];
  changed[index] = { ...changed[index], seconds: Math.round(Math.min(hi, Math.max(lo, atSeconds)) * 100) / 100 };
  return changed;
}
