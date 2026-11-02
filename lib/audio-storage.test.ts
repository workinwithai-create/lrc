import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAudioMimeType, isUserAudioPath } from './audio-storage.ts';

describe('mobile audio MIME', () => {
  it('detects iPhone Files .m4a with blank MIME', () => assert.equal(getAudioMimeType('My song.M4A', ''), 'audio/mp4'));
  it('detects iCloud Drive mp3 when reported as binary', () => assert.equal(getAudioMimeType('track.mp3', 'application/octet-stream'), 'audio/mpeg'));
  it('keeps a real audio MIME', () => assert.equal(getAudioMimeType('clip.mp3', 'audio/x-m4a'), 'audio/x-m4a'));
  it('rejects disguised text and unknown files', () => assert.equal(getAudioMimeType('lyrics.txt', ''), ''));
});

describe('saved recording ownership', () => {
  const owner = '11111111-1111-4111-8111-111111111111';
  const file = '22222222-2222-4222-8222-222222222222.m4a';
  it('accepts an owner-scoped signed upload', () => assert.equal(isUserAudioPath(owner + '/' + file, owner), true));
  it('rejects foreign, arbitrary, and traversing paths', () => {
    assert.equal(isUserAudioPath('33333333-3333-4333-8333-333333333333/' + file, owner), false);
    assert.equal(isUserAudioPath(owner + '/../' + file, owner), false);
    assert.equal(isUserAudioPath(owner + '/random.mp3', owner), false);
  });
});
