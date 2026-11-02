'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TimingEditor from './TimingEditor';

export default function CatalogTimingEditor({
  songId, title, artist, initialLrc,
}: {
  songId: string;
  title: string;
  artist: string | null;
  initialLrc: string;
}) {
  const [lrc, setLrc] = useState(initialLrc);
  const [savedAudio, setSavedAudio] = useState<File | null>(null);
  const [audioState, setAudioState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function restoreAudio() {
      try {
        const response = await fetch('/api/songs/' + encodeURIComponent(songId) + '/audio', {
          signal: controller.signal, cache: 'no-store',
        });
        if (response.status === 404) {
          if (active) setAudioState('missing');
          return;
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not open saved audio');
        const fileResponse = await fetch(result.url, { signal: controller.signal });
        if (!fileResponse.ok) throw new Error('Could not download saved audio');
        const blob = await fileResponse.blob();
        if (active) {
          setSavedAudio(new File([blob], result.fileName || 'original-audio', {
            type: result.contentType || blob.type || 'audio/mpeg',
          }));
          setAudioState('ready');
        }
      } catch (err) {
        if (active && !controller.signal.aborted) {
          console.error('LRC saved audio recovery failed:', err);
          setAudioState('error');
        }
      }
    }
    void restoreAudio();
    return () => { active = false; controller.abort(); };
  }, [songId]);

  function download() {
    const fileName = (title || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.lrc';
    const url = URL.createObjectURL(new Blob([lrc], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 space-y-6">
      <Link href="/dashboard" className="font-mono text-xs font-bold uppercase hover:underline">← Song catalog</Link>
      <div>
        <h1 className="font-display text-4xl uppercase">{title}</h1>
        <p className="font-serif italic">{artist ?? 'Unknown artist'} · Lyric timing editor</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={download} className="bg-blood text-paper font-mono text-xs font-bold px-5 py-3">Download corrected .lrc</button>
        <button type="button" onClick={() => void navigator.clipboard.writeText(lrc)} className="border-2 border-ink font-mono text-xs font-bold px-5 py-3">Copy LRC</button>
      </div>
      <p role="status" className="font-mono text-xs text-mute">
        {audioState === 'loading' && 'Loading your saved original recording…'}
        {audioState === 'ready' && 'Original audio and timed lyrics restored from your catalog.'}
        {audioState === 'missing' && 'This older project has no saved original audio. You can attach a local recording for editing.'}
        {audioState === 'error' && 'Audio could not be loaded. Your saved LRC is still available.'}
      </p>
      <TimingEditor key={songId} initialLrc={lrc} audioFile={savedAudio} audioLoading={audioState === 'loading'} songId={songId} onLrcChange={setLrc} />
    </main>
  );
}
