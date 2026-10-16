'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { parseLrc } from '@/lib/lrc-timing';
import { getWritingInterval, handwritingFraction, writingOffsetLabel } from '@/lib/handwriting-timing';

type Props = { lrc: string; audioFile?: File | null; title?: string; artist?: string };

const MAX_VISIBLE = 350;
const DEFAULT_OFFSET = 0;

function HandPen() {
  return (
    <svg aria-hidden="true" width="32" height="33" viewBox="0 0 50 50" className="writing-pen">
      <defs>
        <linearGradient id="nibMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9ac6a" />
          <stop offset=".53" stopColor="#624e34" />
          <stop offset="1" stopColor="#e0cd9c" />
        </linearGradient>
      </defs>
      <path d="M35 5 44 14 18 39 9 42 12 32Z" fill="#302a22" stroke="#b58c45" strokeWidth="1.3"/>
      <path d="M34 8 41 15 17 38 13 34Z" fill="url(#nibMetal)"/>
      <path d="m10 42 3-8 5 5Z" fill="#d6b886"/>
      <path d="m10 42 2.8-2.6 1 2Z" fill="#171411"/>
      <path d="M20 20c-5-3-9-2-12 2-2 3-3 8-1 11 2 2 5 1 7-3l8-6Z" fill="#d4a780" stroke="#80604e" strokeWidth="1.5"/>
      <path d="M23 17c-4-3-8-1-11 2-3 4-2 8 0 9 3 2 6-3 12-7Z" fill="#edc8a0" stroke="#80604e" strokeWidth="1.5"/>
      <path d="M30 10c-5-3-8-1-12 3-3 3-4 6-2 8 3 2 6-1 14-8Z" fill="#e4ba93" stroke="#80604e" strokeWidth="1.5"/>
    </svg>
  );
}

const LetterStrokes = memo(function LetterStrokes({ text, visible, active }: { text: string; visible: number; active: boolean }) {
  return <>
    {Array.from(text).map((letter, j) => (
      <span key={j} className={j < visible ? 'handwriting-letter-visible' : 'handwriting-letter-pending'} aria-hidden="true">
        {letter}{active && j === visible - 1 && <HandPen />}
      </span>
    ))}
  </>;
});

/** Audio-driven handwriting animation: playback time is the only clock, so seeking and pausing remain exact. */
export default function HandwrittenPlayer({ lrc, audioFile, title, artist }: Props) {
  const parsed = useMemo(() => parseLrc(lrc), [lrc]);
  const lines = useMemo(() => parsed.lines.slice(0, MAX_VISIBLE), [parsed]);
  const [localAudio, setLocalAudio] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  // Negative starts writing before the vocal, positive starts after it.
  const [offset, setOffset] = useState(DEFAULT_OFFSET);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [inkColor, setInkColor] = useState<'sepia' | 'blue'>('sepia');
  const player = useRef<HTMLAudioElement>(null);
  const activeRow = useRef<HTMLDivElement>(null);
  const notebook = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);
  const lastRendered = useRef(-1);

  const source = audioFile ?? localAudio;

  useEffect(() => {
    if (!source) { setAudioUrl(null); return; }
    setAudioDuration(undefined);
    const url = URL.createObjectURL(source);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [source]);

  useEffect(() => {
    if (!playing) return;
    const frame = () => {
      const t = player.current?.currentTime ?? 0;
      // 15fps is enough for handwriting and prevents Safari re-rendering every letter on every video frame.
      if (Math.abs(t - lastRendered.current) >= .065) {
        lastRendered.current = t;
        setPlayhead(t);
      }
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  // Build a deterministic timeline from the saved LRC instead of any wall-clock timers.
  // Pen pacing adapts to the available interval before the next sung line.
  const writing = useMemo(() => lines.map((_, i) => getWritingInterval(lines, i, offset, speed, audioDuration)), [lines, offset, speed, audioDuration]);
  const activeIndex = writing.reduce((last, interval, i) => (interval.start <= playhead ? i : last), -1);

  useEffect(() => {
    const row = activeRow.current;
    const page = notebook.current;
    if (!row || !page) return;
    const rowTop = row.getBoundingClientRect().top;
    const paperTop = page.getBoundingClientRect().top;
    // Only move the notebook's interior. scrollIntoView would yank Safari's entire screen.
    page.scrollTo({ top: page.scrollTop + rowTop - paperTop - page.clientHeight * .45, behavior: 'smooth' });
  }, [activeIndex]);

  const timeLabel = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const titleTag = parsed.metadata.find(v => /^\[ti:/i.test(v))?.slice(4, -1);
  const artistTag = parsed.metadata.find(v => /^\[ar:/i.test(v))?.slice(4, -1);

  return (
    <section className="handwriting-studio" aria-label="Handwritten lyric playback">
      <div className="handwriting-controls">
        <div>
          <p className="handwriting-kicker">LRC FORGE · HANDWRITTEN PLAYBACK</p>
          <h3 className="handwriting-header">Watch the words find the page.</h3>
          <p className="handwriting-sub">The pen follows each sung line by default. Try Lead for lyric videos, or Trail for an intentional late reveal. Pause or seek to replay the strokes.</p>
        </div>
        {!audioFile && (
          <label className="handwriting-audio-upload">
            Choose recording to play
            <input type="file" accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,.webm,audio/*" onChange={e => setLocalAudio(e.target.files?.[0] ?? null)} />
          </label>
        )}
        <audio
          ref={player}
          src={audioUrl || undefined}
          controls
          preload="metadata"
          className="handwriting-audio"
          onLoadedMetadata={e => setAudioDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : undefined)}
          onTimeUpdate={e => setPlayhead(e.currentTarget.currentTime)}
          onSeeked={e => setPlayhead(e.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {!audioUrl && <p className="handwriting-help">Select the original recording to animate these lyrics against its playback.</p>}
        <div className="handwriting-adjustments">
          <div className="handwriting-sync">
            <div className="handwriting-mode-buttons" role="group" aria-label="Handwriting alignment">
              <button type="button" className={Math.abs(offset) < .05 ? 'handwriting-mode-active' : ''} aria-pressed={Math.abs(offset) < .05} onClick={() => setOffset(0)}>Sync</button>
              <button type="button" className={offset < -.05 ? 'handwriting-mode-active' : ''} aria-pressed={offset < -.05} onClick={() => setOffset(-.4)}>Lead</button>
              <button type="button" className={offset > .05 ? 'handwriting-mode-active' : ''} aria-pressed={offset > .05} onClick={() => setOffset(.4)}>Trail</button>
            </div>
            <label>
              <span>Timing <strong>{writingOffsetLabel(offset)}</strong></span>
              <input type="range" min="-1" max="1" step=".1" value={offset} onChange={e => setOffset(Number(e.target.value))} aria-label="Writing offset: negative for early, zero for synchronized, positive for late" />
            </label>
          </div>
          <label>
            Pen pace <strong>{speed.toFixed(1)}×</strong>
            <input type="range" min=".6" max="1.8" step=".2" value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Handwriting stroke speed" />
          </label>
          <button className="handwriting-ink-toggle" type="button" onClick={() => setInkColor(x => x === 'sepia' ? 'blue' : 'sepia')}>
            {inkColor === 'sepia' ? 'Blue ink' : 'Sepia ink'}
          </button>
        </div>
        <p className="handwriting-counter">{timeLabel(playhead)} · {lines.length} timed lines {lines.length < parsed.lines.length ? '· first 350 shown' : ''}</p>
      </div>

      <div ref={notebook} className={`handwriting-paper handwriting-${inkColor}`}>
        <div className="handwriting-margin" />
        <div className="handwriting-paper-content">
          <div className="handwriting-title">{title || titleTag || 'Untitled'}</div>
          <div className="handwriting-byline">words in motion · {artist || artistTag || 'LRC Forge'}</div>
          {lines.map((entry, i) => {
            const isMarker = /^\[[^\]]+\]$/.test(entry.text.trim());
            const { start, duration } = writing[i];
            const fraction = handwritingFraction(playhead, start, duration);
            const timeSinceStart = playhead - start;
            const totalLetters = Array.from(entry.text).length;
            const visible = fraction >= 1 ? totalLetters : Math.floor(fraction * totalLetters);
            const active = i === activeIndex && fraction < 1 && timeSinceStart >= 0;
            return (
              <div
                key={i}
                ref={i === activeIndex ? activeRow : undefined}
                className={`handwriting-line ${isMarker ? 'handwriting-section' : ''}`}
                aria-label={entry.text}
                aria-live="off"
              >
                <LetterStrokes text={entry.text} visible={visible} active={active} />
              </div>
            );
          })}
          {activeIndex < 0 && <div className="handwriting-waiting">✧ The ink is waiting for the first line…</div>}
          {lines.length === 0 && <p className="handwriting-waiting">Generate or import a timestamped LRC file to begin.</p>}
          <div className="handwriting-signature">written in sound · forged in ink</div>
        </div>
      </div>
    </section>
  );
}
