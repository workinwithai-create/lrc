'use client';

import { useEffect, useRef, useState } from 'react';
import { parseLrc, retimeLine, serializeLrc, type LrcLine } from '@/lib/lrc-timing';
import HandwrittenPlayer from './HandwrittenPlayer';

type Props = {
  initialLrc: string;
  audioFile: File | null;
  songId?: string | null;
  onLrcChange: (lrc: string) => void;
};

export default function TimingEditor({ initialLrc, audioFile, songId, onLrcChange }: Props) {
  const initial = parseLrc(initialLrc);
  const [lines, setLines] = useState<LrcLine[]>(() => initial.lines);
  const [savedLrc, setSavedLrc] = useState(initialLrc);
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const previewFile = audioFile ?? selectedAudio;
  const [playhead, setPlayhead] = useState(0);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const player = useRef<HTMLAudioElement>(null);
  const currentLrc = serializeLrc({ metadata: initial.metadata, lines });
  const dirty = currentLrc !== savedLrc;

  useEffect(() => {
    if (!previewFile) { setAudioUrl(''); return; }
    const objectUrl = URL.createObjectURL(previewFile);
    setAudioUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [previewFile]);

  function change(next: LrcLine[]) {
    setLines(next);
    onLrcChange(serializeLrc({ metadata: initial.metadata, lines: next }));
    setStatus('');
  }

  function changeText(index: number, text: string) {
    change(lines.map((line, i) => i === index ? { ...line, text } : line));
  }

  function seek(seconds: number) {
    const el = player.current;
    if (!el) return;
    el.currentTime = seconds;
    setPlayhead(seconds);
    void el.play().catch(() => {});
  }

  async function save() {
    if (!songId) { setStatus('No saved song ID yet — you can still download the corrected .lrc.'); return; }
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lrc: currentLrc }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Save failed');
      setSavedLrc(currentLrc);
      setStatus('Corrections saved to your LRC Forge catalog.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save corrections');
    } finally {
      setSaving(false);
    }
  }

  const activeIndex = lines.reduce((last, line, index) =>
    line.seconds <= playhead + 0.01 ? index : last, -1);

  return (
    <section className="bg-paper border-t-2 border-ink p-3 sm:p-4 space-y-4" aria-label="Lyric timing editor">
      <HandwrittenPlayer lrc={currentLrc} audioFile={previewFile} />
      <div>
        <h3 className="font-display text-2xl uppercase">Fine-tune timing</h3>
        <p className="font-serif italic text-sm text-mute">
          Listen to your original recording, select a lyric to jump to it, then nudge its timestamp or set it to the playhead.
          Your original words and section order are preserved.
        </p>
      </div>
      {!audioFile && (
        <label className="block border border-ink p-3 font-mono text-xs cursor-pointer">
          Load the recording for timing playback (stays on this device)
          <input type="file" accept="audio/*,.mp3,.m4a,.wav,.flac" className="block mt-2 text-xs" onChange={(e) => setSelectedAudio(e.target.files?.[0] ?? null)} />
        </label>
      )}
      {audioUrl ? (
        <audio
          ref={player}
          controls
          preload="metadata"
          src={audioUrl}
          onTimeUpdate={(e) => setPlayhead(e.currentTarget.currentTime)}
          onSeeked={(e) => setPlayhead(e.currentTarget.currentTime)}
          className="w-full"
          aria-label="Original recording"
        />
      ) : (
        <p className="font-mono text-xs text-mute">Audio preview is available immediately after generating. Saved songs can be downloaded without audio.</p>
      )}
      <div className="font-mono text-xs">Playhead: <strong>{playhead.toFixed(2)}s</strong> · {lines.length} lines</div>
      <div className="max-h-96 overflow-y-auto border border-ink divide-y divide-ink/20">
        {lines.map((line, i) => (
          <div key={i} className={`p-3 space-y-2 ${i === activeIndex ? 'bg-gold/20' : ''}`}>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={() => seek(line.seconds)}
                disabled={!audioUrl}
                className="font-mono text-xs font-bold text-blood hover:underline disabled:opacity-40"
                aria-label={`Listen at line ${i + 1}`}
              >▶ {line.seconds.toFixed(2)}s</button>
              <button type="button" className="border border-ink px-2 py-1 text-xs" onClick={() => change(retimeLine(lines, i, line.seconds - 0.1))}>−0.1s</button>
              <button type="button" className="border border-ink px-2 py-1 text-xs" onClick={() => change(retimeLine(lines, i, line.seconds + 0.1))}>+0.1s</button>
              <button type="button" disabled={!audioUrl} className="border border-ink px-2 py-1 text-xs disabled:opacity-40" onClick={() => change(retimeLine(lines, i, player.current?.currentTime ?? playhead))}>Set to playhead</button>
            </div>
            <input
              type="text"
              value={line.text}
              onChange={(e) => changeText(i, e.target.value)}
              aria-label={`Lyrics for line ${i + 1}`}
              className="w-full p-2 border border-ink/30 bg-paper font-mono text-xs"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => void save()}
          disabled={!dirty || saving || !songId}
          className="bg-ink text-paper px-5 py-3 font-mono text-xs font-bold disabled:opacity-40"
        >{saving ? 'Saving…' : 'Save corrected timing'}</button>
        <span className="font-mono text-xs text-mute">{dirty ? 'Unsaved corrections — Download uses your latest timing' : 'All changes saved'}</span>
      </div>
      {status && <p role="status" className="text-sm font-mono">{status}</p>}
      <div className="border-t border-ink/20 pt-4">
        <h4 className="font-display text-lg uppercase">Use it in Pipe Dreams INK</h4>
        <p className="text-sm font-serif italic">
          Click <strong>Save</strong> above the LRC output to download your corrected .lrc.
          In INK, open <strong>Practice → Learn This Song → Import .lrc</strong>.
          INK already supports timed lyric imports; no duplicate transcription required.
        </p>
        <a href="https://studio.workinwithai.com/" target="_blank" rel="noopener noreferrer" className="inline-block mt-3 border-2 border-ink px-4 py-2 font-mono text-xs font-bold hover:bg-ink hover:text-paper">
          Open Pipe Dreams Studio ↗
        </a>
      </div>
    </section>
  );
}
