'use client';

import { useState } from 'react';
import Link from 'next/link';
import TimingEditor from '@/components/tool/TimingEditor';
import { parseLrc } from '@/lib/lrc-timing';

const SAMPLE_LRC = `[ti:Timing Editor Demo]
[ar:Pipe Dreams Studio]

[00:03.00][Verse 1]
[00:05.00]The first line begins right here
[00:09.00]The second line follows along
[00:14.00][Chorus]
[00:16.00]Let the music lead the way
`;

export default function TimingPreviewPage() {
  const [input, setInput] = useState(SAMPLE_LRC);
  const [lrc, setLrc] = useState(SAMPLE_LRC);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');

  function load(content: string) {
    if (!parseLrc(content).lines.length) {
      setError('No timed lines found. Each line needs a timestamp such as [00:12.50].');
      return;
    }
    setInput(content);
    setLrc(content);
    setRevision((n) => n + 1);
    setError('');
  }

  function download() {
    const url = URL.createObjectURL(new Blob([lrc], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lyrics-for-ink.lrc';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main className="max-w-3xl mx-auto px-5 py-10 space-y-5">
      <Link href="/" className="font-mono text-xs font-bold uppercase hover:underline">← LRC Forge</Link>
      <div>
        <p className="font-mono text-xs text-blood uppercase">Preview · no login or server upload</p>
        <h1 className="font-display text-5xl uppercase">Lyric timing editor</h1>
        <p className="font-serif italic text-lg">Try the new editor with the sample or paste an existing timestamped .lrc file. Your audio and edits stay in this browser until you download.</p>
      </div>
      <label className="block font-mono text-xs font-bold uppercase">Paste your LRC
        <textarea value={input} onChange={e => setInput(e.target.value)} rows={7} className="block mt-2 w-full border-2 border-ink bg-paper p-3 font-mono text-xs normal-case font-normal" />
      </label>
      <div className="flex flex-wrap gap-3 items-center">
        <button type="button" onClick={() => load(input)} className="bg-ink text-paper font-mono text-xs font-bold px-4 py-3">Load these lyrics</button>
        <label className="border-2 border-ink font-mono text-xs font-bold px-4 py-3 cursor-pointer">
          Open .lrc file
          <input type="file" accept=".lrc,text/plain" hidden onChange={async e => {
            const file = e.target.files?.[0];
            if (file) load(await file.text());
            e.target.value = '';
          }} />
        </label>
        <button type="button" onClick={download} className="bg-blood text-paper font-mono text-xs font-bold px-4 py-3">Download for INK</button>
      </div>
      {error && <p role="alert" className="font-mono text-sm text-blood">{error}</p>}
      <TimingEditor key={revision} initialLrc={lrc} audioFile={null} onLrcChange={setLrc} />
    </main>
  );
}
