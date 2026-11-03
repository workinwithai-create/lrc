import type { LrcDocument } from './lrc-timing';

/**
 * Identify likely generator credits that were imported as timestamped lyrics.
 * Detection never modifies a file; a writer must explicitly move a line.
 */
export function isPossibleGeneratorCredit(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 240) return false;
  const normalized = value.replace(/\s+/g, ' ');
  if (/^(?:https?:\/\/)?(?:www[.\s]+)?lrcgenerator[.\s]+com\/?$/i.test(normalized)) return true;
  if (/^(?:https?:\/\/)?www\.[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i.test(normalized)) return true;
  if (/^(?:generated|synced|timed|created|powered|made)\s+(?:by|with|using)\s+.{2,160}$/i.test(normalized)
      && /(?:https?:\/\/|www\.|lrc\s?generator|lyrics\s?tool)/i.test(normalized)) return true;
  return false;
}

/** Move a selected credit out of karaoke lyrics without losing the source. */
export function moveCreditToMetadata(doc: LrcDocument, index: number): LrcDocument {
  const line = doc.lines[index];
  if (!line || !isPossibleGeneratorCredit(line.text)) return doc;
  // The original timestamp remains part of the attribution record.
  const credit = `[credit:${line.seconds.toFixed(2)}s ${line.text.replace(/[\]\r\n]/g, ' ').trim()}]`;
  return {
    metadata: [...doc.metadata, credit],
    lines: doc.lines.filter((_, i) => i !== index),
  };
}
