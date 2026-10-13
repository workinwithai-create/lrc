'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { WWA_SUPABASE_ANON_KEY, WWA_SUPABASE_URL } from '@/lib/wwa-auth';

export default function PreviewSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (working) return;
    setWorking(true);
    setError('');
    try {
      // The Vercel preview has a different domain from WorkinWithAI.
      // Establish this site's own secure Supabase session before the normal
      // server-side LRC bridge creates the existing data session.
      const supabase = createBrowserClient(WWA_SUPABASE_URL, WWA_SUPABASE_ANON_KEY);
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      window.location.assign('/auth/wwa-bridge?next=%2Ftiming-preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5">
        <a href="https://lrcforge.workinwithai.com/" className="font-display text-3xl">LRC Forge</a>
        <div className="border-2 border-ink bg-paper p-6 space-y-4">
          <p className="text-blood font-mono text-xs uppercase">Working preview — actual Whisper generation</p>
          <h1 className="font-display text-4xl uppercase">Generate timed lyrics</h1>
          <p className="font-serif text-base">
            The original Whisper + Deepgram generator runs here, followed by the new timing editor.
            This preview uses a separate Vercel address, so sign in to your existing WorkinWithAI account once to enable audio processing.
          </p>
          <form onSubmit={signIn} className="space-y-4">
            <label className="block text-sm font-mono">WorkinWithAI email
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border-2 border-ink p-3 bg-paper" />
            </label>
            <label className="block text-sm font-mono">Password
              <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border-2 border-ink p-3 bg-paper" />
            </label>
            {error && <p role="alert" className="font-mono text-sm text-blood">{error}</p>}
            <button type="submit" disabled={working} className="w-full bg-blood text-paper py-4 font-display text-2xl uppercase disabled:opacity-60">
              {working ? 'Signing in…' : 'Sign in and generate →'}
            </button>
          </form>
          <p className="text-xs font-mono text-mute">
            No new account needed. The preview never receives your OpenAI or Deepgram API keys.
          </p>
        </div>
      </div>
    </main>
  );
}
