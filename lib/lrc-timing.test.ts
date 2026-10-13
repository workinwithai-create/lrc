import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatLrcTimestamp, parseLrc, retimeLine, serializeLrc } from './lrc-timing.ts';

describe('LRC timing tools', () => {
  const sample = '[ti:Memory of You]\n[ar:Mark Parsons Jr.]\n\n[00:12.40][Verse 1]\n[00:14.25]I remember\n[00:36.10][Chorus]\n[00:38.05]I remember\n';

  it('preserves metadata, repeated chorus text and timed section markers', () => {
    const doc = parseLrc(sample);
    assert.equal(doc.metadata.length, 2);
    assert.deepEqual(doc.lines.map(l => l.text), ['[Verse 1]', 'I remember', '[Chorus]', 'I remember']);
    assert.equal(doc.lines[3].seconds, 38.05);
    assert.deepEqual(parseLrc(serializeLrc(doc)), doc);
  });

  it('does not lose sub-second precision at 1:00 boundary', () => {
    assert.equal(formatLrcTimestamp(59.995), '[01:00.00]');
    assert.equal(formatLrcTimestamp(64.27), '[01:04.27]');
    assert.equal(formatLrcTimestamp(-2), '[00:00.00]');
  });

  it('accepts a 3-digit fraction and rejects invalid seconds', () => {
    const doc = parseLrc('[00:12.345]yes\n[00:67.00]no\n[00:13.5]maybe');
    assert.equal(doc.lines.length, 2);
    assert.equal(doc.lines[0].seconds, 12.345);
    assert.equal(doc.lines[1].seconds, 13.5);
  });

  it('keeps line order while nudging a selected timestamp', () => {
    const doc = parseLrc(sample);
    assert.equal(retimeLine(doc.lines, 1, 90)[1].seconds, 36.09);
    assert.equal(retimeLine(doc.lines, 1, -30)[1].seconds, 12.41);
    assert.equal(retimeLine(doc.lines, -1, 3), doc.lines);
  });
});
