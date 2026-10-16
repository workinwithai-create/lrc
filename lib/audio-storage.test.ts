import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAudioMimeType } from './audio-storage.ts';

describe('mobile audio MIME', () => {
  it('detects iPhone Files .m4a with blank MIME', () => assert.equal(getAudioMimeType('My song.M4A', ''), 'audio/mp4'));
  it('detects iCloud Drive mp3 when reported as binary', () => assert.equal(getAudioMimeType('track.mp3', 'application/octet-stream'), 'audio/mpeg'));
  it('keeps a real audio MIME', () => assert.equal(getAudioMimeType('clip.mp3', 'audio/x-m4a'), 'audio/x-m4a'));
  it('rejects disguised text and unknown files', () => assert.equal(getAudioMimeType('lyrics.txt', ''), ''));
});
