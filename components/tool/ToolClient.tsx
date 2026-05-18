'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AUDIO_UPLOAD_BUCKET, MAX_AUDIO_BYTES } from '@/lib/audio-storage';

type Props = {
  user: any;
  totalCredits: number;
};

export default function ToolClient({ user, totalCredits: initialCredits }: Props) {
  const [credits, setCredits] = useState(initialCredits);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [mode, setMode] = useState<'smart' | 'strict'>('smart');
  const [offsetSeconds, setOffsetSeconds] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    lrc: string;
    wordCount: number;
    lineCount: number;
    duration: number;
  } | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);

  const canGenerate =
    audioFile && (mode === 'strict' || lyrics.trim().length > 10);

  function handleFile(file: File) {
    if (file.size > MAX_AUDIO_BYTES) {
      setError('File too large — max 25MB');
      return;
    }
    setAudioFile(file);
    setError('');
  }

  async function readResponseJson(res: Response) {
    const text = await res.text();
    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(text || `Server error ${res.status}`);
    }
  }

  async function generate() {
    if (!canGenerate || !audioFile) return;

    setStatus('uploading');
    setError('');
    setResult(null);
    setProgress(15);
    setStatusMsg('Uploading audio...');

    try {
      const tokenRes = await fetch('/api/audio-upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: audioFile.name,
          contentType: audioFile.type || 'audio/mpeg',
          size: audioFile.size,
        }),
      });

      const tokenData = await readResponseJson(tokenRes);
      if (!tokenRes.ok) {
        throw new Error(tokenData.error || `Upload setup failed (${tokenRes.status})`);
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(AUDIO_UPLOAD_BUCKET)
        .uploadToSignedUrl(tokenData.path, tokenData.token, audioFile, {
          contentType: audioFile.type || 'audio/mpeg',
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Audio upload failed');
      }

      const formData = new FormData();
      formData.append('audioPath', tokenData.path);
      formData.append('audioName', audioFile.name);
      formData.append('audioType', audioFile.type || 'audio/mpeg');
      formData.append('lyrics', lyrics);
      formData.append('mode', mode);
      formData.append('title', songTitle || 'Untitled');
      formData.append('artist', artistName || 'Mark Parsons Jr.');
      formData.append('offset', String(offsetSeconds));

      setProgress(35);
      setStatusMsg('Whisper is listening to every word...');

      const res = await fetch('/api/generate-lrc', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);
      setStatusMsg('Aligning lyrics...');

      if (!res.ok) {
        const data = await readResponseJson(res);
        if (data.code === 'NO_CREDITS') {
          window.location.href = '/pricing';
          return;
        }
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const data = await readResponseJson(res);
      setProgress(100);
      setStatusMsg('Done!');
      setResult({
        lrc: data.lrc,
        wordCount: data.wordCount,
        lineCount: data.lineCount,
        duration: data.duration,
      });
      setCredits(data.creditsRemaining);
      setStatus('done');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  }

  function download() {
    if (!result) return;
    const filename =
      (songTitle || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.lrc';
    const blob = new Blob([result.lrc], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.lrc);
  }

  function reset() {
    setAudioFile(null);
    setSongTitle('');
    setArtistName('');
    setLyrics('');
    setResult(null);
    setStatus('idle');
    setProgress(0);
    setError('');
    setOffsetSeconds(0);
  }

  return (
    <main className="min-h-screen">
      <nav className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between border-b-[3px] border-ink">
        <Link href="/dashboard" className="font-display text-2xl tracking-tight">
          ← Dashboard
        </Link>
        <div className="font-mono text-xs tracking-widest uppercase">
          Credits: <span className="text-blood font-bold">{credits}</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="font-serif italic text-lg text-blood mb-1">
          Upload a track. Paste the words.
        </div>
        <h1 className="font-display text-5xl md:text-7xl uppercase leading-none tracking-tight">
          Forge an<br />
          <span className="text-blood italic font-serif">LRC</span> file
        </h1>

        <div className="border-t-2 border-ink mt-6 pt-6 space-y-4">
          {/* Mode toggle */}
          <div className="flex border-2 border-ink">
            <button
              onClick={() => setMode('smart')}
              className={`flex-1 py-3 font-display text-base tracking-wider uppercase transition-colors ${
                mode === 'smart' ? 'bg-ink text-paper' : 'bg-paper text-ink'
              }`}
            >
              Smart Align
            </button>
            <button
              onClick={() => setMode('strict')}
              className={`flex-1 py-3 font-display text-base tracking-wider uppercase transition-colors border-l-2 border-ink ${
                mode === 'strict' ? 'bg-ink text-paper' : 'bg-paper text-ink'
              }`}
            >
              Strict Whisper
            </button>
          </div>
          <div className="font-serif italic text-sm text-mute px-1">
            {mode === 'smart'
              ? 'Paste your lyrics — the output keeps your exact lines with Whisper timing. Use this for Smule.'
              : "No lyrics needed. Whisper transcribes and groups by pauses. Output won't match your lyric lines."}
          </div>

          {/* Timing offset */}
          <div className="bg-paper border-2 border-ink hard-shadow px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest uppercase">Timing Offset</span>
              <span className="font-mono text-sm font-bold">
                {offsetSeconds === 0 ? '0.0 s' : offsetSeconds > 0 ? `−${offsetSeconds.toFixed(1)} s` : `+${Math.abs(offsetSeconds).toFixed(1)} s`}
              </span>
            </div>
            <input
              type="range"
              min={-3}
              max={5}
              step={0.5}
              value={offsetSeconds}
              onChange={(e) => setOffsetSeconds(parseFloat(e.target.value))}
              className="w-full accent-blood"
            />
            <div className="font-serif italic text-xs text-mute">
              If lyrics appear <strong>late</strong>, drag right. If they appear <strong>early</strong>, drag left.
            </div>
          </div>

          {/* Audio upload */}
          <div className="bg-paper border-2 border-ink hard-shadow">
            <div className="bg-ink text-paper px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display text-xl">01</span>
                <span className="font-mono text-[10px] tracking-widest uppercase">The Track</span>
              </div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-gold">
                {audioFile ? '✓ loaded' : 'required'}
              </span>
            </div>
            <div className="p-5">
              <label
                htmlFor="audio-input"
                className={`block cursor-pointer w-full text-center py-7 font-display text-2xl tracking-wider uppercase transition-transform ${
                  audioFile ? 'bg-ink text-paper' : 'bg-blood text-paper'
                } active:translate-x-[2px] active:translate-y-[2px] relative`}
              >
                {audioFile ? 'Change File' : 'Choose Audio File'}
                <span className="block font-serif italic text-sm font-normal normal-case tracking-normal mt-1 opacity-90">
                  MP3 · WAV · M4A · FLAC · up to 25MB
                </span>
              </label>
              <input
                ref={audioInputRef}
                type="file"
                id="audio-input"
                accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="sr-only"
              />
              {audioFile && (
                <div className="mt-3 bg-ink text-paper p-3 border-l-4 border-gold">
                  <div className="font-mono text-xs font-bold text-gold break-all">
                    {audioFile.name}
                  </div>
                  <div className="font-mono text-[10px] text-paper/70 mt-1">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Title/artist */}
          <div className="bg-paper border-2 border-ink hard-shadow">
            <div className="bg-ink text-paper px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display text-xl">02</span>
                <span className="font-mono text-[10px] tracking-widest uppercase">The Song</span>
              </div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-gold">optional</span>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Song title"
                className="w-full bg-transparent border-b-2 border-ink font-serif italic text-xl py-2 focus:outline-none focus:border-blood"
              />
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Artist (defaults to Mark Parsons Jr.)"
                className="w-full bg-transparent border-b-2 border-ink font-serif italic text-xl py-2 focus:outline-none focus:border-blood"
              />
            </div>
          </div>

          {/* Lyrics */}
          <div className="bg-paper border-2 border-ink hard-shadow">
            <div className="bg-ink text-paper px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display text-xl">03</span>
                <span className="font-mono text-[10px] tracking-widest uppercase">
                  The Words {mode === 'strict' && '(optional)'}
                </span>
              </div>
              <span className="font-mono text-[10px] tracking-widest uppercase text-gold">
                {mode === 'smart' ? 'required' : 'optional'}
              </span>
            </div>
            <div className="p-5">
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder={`Paste full lyrics here.
One line per lyric line.

[Verse 1]
First line of the verse
Second line of the verse

[Chorus]
Chorus line
Chorus line`}
                className="w-full min-h-[200px] border border-ink p-4 font-mono text-sm leading-relaxed bg-paper focus:outline-none focus:border-blood resize-y"
              />
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            disabled={!canGenerate || status === 'uploading'}
            className="w-full bg-ink text-paper py-6 font-display text-3xl tracking-wider uppercase disabled:opacity-40 hard-shadow-blood active:translate-x-[3px] active:translate-y-[3px] active:[box-shadow:3px_3px_0_var(--blood)]"
          >
            {status === 'uploading' ? 'Forging...' : 'Forge It'}{' '}
            <span className="text-gold">→</span>
          </button>

          {/* Status */}
          {status === 'uploading' && (
            <div className="bg-ink text-paper p-4 border-l-4 border-gold">
              <div className="font-mono text-[10px] tracking-widest uppercase text-gold mb-1">
                Working
              </div>
              <div className="font-serif italic text-lg">{statusMsg}</div>
              <div className="mt-3 h-1 bg-paper/15">
                <div
                  className="h-full bg-gold transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-blood text-paper p-4 border-l-4 border-ink">
              <div className="font-mono text-[10px] tracking-widest uppercase mb-1">Error</div>
              <div className="font-mono text-xs leading-relaxed">{error}</div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="border-2 border-ink hard-shadow-gold">
              <div className="bg-gold text-ink px-4 py-3 flex items-center justify-between border-b-2 border-ink">
                <div className="font-display text-xl uppercase">.LRC Ready</div>
                <div className="flex gap-2">
                  <button
                    onClick={copy}
                    className="bg-ink text-paper px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase"
                  >
                    Copy
                  </button>
                  <button
                    onClick={download}
                    className="bg-blood text-paper px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="bg-paper px-4 py-2 border-b-2 border-ink font-mono text-[10px] tracking-widest uppercase text-mute">
                <span className="text-ink font-bold">{result.lineCount}</span> lines ·{' '}
                <span className="text-ink font-bold">{result.wordCount}</span> words ·{' '}
                <span className="text-ink font-bold">
                  {Math.floor(result.duration / 60)}:
                  {String(Math.floor(result.duration % 60)).padStart(2, '0')}
                </span>
              </div>
              <pre className="bg-ink text-paper p-4 font-mono text-xs leading-loose max-h-80 overflow-auto whitespace-pre">
                {result.lrc}
              </pre>
              <div className="bg-paper p-4 border-t-2 border-ink">
                <button
                  onClick={reset}
                  className="font-mono text-xs font-bold tracking-widest uppercase text-blood hover:underline"
                >
                  ← Forge another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
