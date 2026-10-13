'use client';

import { useState } from 'react';
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
      <TimingEditor key={songId} initialLrc={lrc} audioFile={null} songId={songId} onLrcChange={setLrc} />
    </main>
  );
}
