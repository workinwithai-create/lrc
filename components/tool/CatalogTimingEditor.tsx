'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AUDIO_UPLOAD_BUCKET, MAX_AUDIO_BYTES, getAudioMimeType } from '@/lib/audio-storage';
import TimingEditor from './TimingEditor';

export default function CatalogTimingEditor({
  songId, title, artist, initialLrc, hasStoredAudio,
}: {
  songId: string;
  title: string;
  artist: string | null;
  initialLrc: string;
  hasStoredAudio: boolean;
}) {
  const [lrc, setLrc] = useState(initialLrc);
  const [hasAudio, setHasAudio] = useState(hasStoredAudio);
  const [localRecording, setLocalRecording] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const audioUrl = `/api/songs/${songId}/audio`;

  function download() {
    const fileName = (title || 'song').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.lrc';
    const url = URL.createObjectURL(new Blob([lrc], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function attachRecording(file: File) {
    setWorking(true);
    setRecordingError('');
    try {
      const type = getAudioMimeType(file.name, file.type);
      if (!type || !file.size || file.size > MAX_AUDIO_BYTES) throw new Error('Choose a supported recording under 25MB.');
      const tokenResponse = await fetch('/api/audio-upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: type, size: file.size }),
      });
      const token = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(token.error || 'Could not prepare audio upload');

      const { error: uploadError } = await createClient().storage.from(AUDIO_UPLOAD_BUCKET)
        .uploadToSignedUrl(token.path, token.token, file, { contentType: type });
      if (uploadError) throw new Error(uploadError.message);

      const saveResponse = await fetch(audioUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: token.path, filename: file.name }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || 'Could not attach recording');

      setLocalRecording(file);
      setHasAudio(true);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Could not attach recording');
    } finally {
      setWorking(false);
    }
  }

  async function loadRecordingForTools() {
    setWorking(true);
    setRecordingError('');
    try {
      const response = await fetch(audioUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not open the saved recording');
      const blob = await response.blob();
      if (!blob.size || blob.size > MAX_AUDIO_BYTES) throw new Error('Saved recording exceeds editor memory limit.');
      const name = `${(title || 'song').replace(/[^a-z0-9_-]/gi, '-')}.mp3`;
      setLocalRecording(new File([blob], name, { type: blob.type || 'audio/mpeg' }));
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : 'Could not load recording');
    } finally {
      setWorking(false);
    }
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
        {hasAudio && (
          <a href={`${audioUrl}?download=1`} className="border-2 border-ink font-mono text-xs font-bold px-5 py-3">Download recording</a>
        )}
      </div>
      <section className="border-2 border-ink p-4 space-y-3">
        <h2 className="font-display text-xl uppercase">Your saved song</h2>
        {hasAudio ? (
          <>
            <p className="text-sm">Recording and editable timed lyrics are linked in your catalog. You can listen and adjust line timing below.</p>
            {!localRecording && (
              <button disabled={working} onClick={() => void loadRecordingForTools()} className="border-2 border-ink px-4 py-2 font-mono text-xs font-bold disabled:opacity-50">
                {working ? 'Loading recording…' : 'Load saved recording into karaoke and creative tools'}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="text-sm">This older LRC has no retained recording. Select the original song to attach it without regenerating lyrics or spending credits.</p>
            <input type="file" accept=".mp3,.m4a,.wav,.flac,.ogg,.aac,.webm,audio/*" disabled={working}
              aria-label="Reattach your original recording"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void attachRecording(file);
              }}
              className="block w-full font-mono text-xs" />
            {working && <p className="font-mono text-xs" role="status">Saving recording to your song…</p>}
          </>
        )}
        {recordingError && <p role="alert" className="text-sm text-blood">{recordingError}</p>}
      </section>
      <TimingEditor key={songId} initialLrc={initialLrc} audioFile={localRecording} savedAudioUrl={hasAudio ? audioUrl : null} songId={songId} onLrcChange={setLrc} />
    </main>
  );
}
