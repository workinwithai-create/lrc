import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getWritingInterval, handwritingFraction, writingOffsetLabel } from './handwriting-timing.ts';

const lyrics = [
  { seconds: 5, text: 'I was born in the dust' },
  { seconds: 8, text: 'Under an autumn sky' },
  { seconds: 13, text: 'With another long line to sing and write' },
];

describe('LRC handwriting clock', () => {
  it('starts directly on the lyric by default', () => {
    assert.equal(getWritingInterval(lyrics, 0).start, 5);
    assert.equal(handwritingFraction(4.99, 5, 2), 0);
    assert.equal(handwritingFraction(5, 5, 2), 0);
    assert.equal(handwritingFraction(7, 5, 2), 1);
  });
  it('supports lead and trailing timing with signed offsets', () => {
    assert.equal(getWritingInterval(lyrics, 0, -.4).start, 4.6);
    assert.equal(getWritingInterval(lyrics, 0, .4).start, 5.4);
    assert.equal(writingOffsetLabel(0), 'With the vocal · 0.0s');
    assert.match(writingOffsetLabel(-.4), /Ahead/);
    assert.match(writingOffsetLabel(.4), /Behind/);
  });
  it('fits long lines before the next onset, regardless of pen pace', () => {
    const close = [{ seconds: 12, text: 'Too many words for a tiny window' }, { seconds: 12.55, text: 'Next' }];
    for (const pace of [.6, 1, 1.8]) {
      const interval = getWritingInterval(close, 0, -.3, pace);
      assert.ok(interval.start + interval.duration < 12.25);
    }
  });
  it('estimates last line duration and respects audio end', () => {
    const interval = getWritingInterval(lyrics, 2, 0, 1, 15);
    assert.ok(interval.duration <= 2);
  });
  it('is deterministic when seeking backwards or pausing', () => {
    const interval = getWritingInterval(lyrics, 1);
    const ahead = handwritingFraction(9, interval.start, interval.duration);
    const behind = handwritingFraction(8.1, interval.start, interval.duration);
    assert.ok(ahead > behind);
    assert.equal(ahead, handwritingFraction(9, interval.start, interval.duration));
  });
});
