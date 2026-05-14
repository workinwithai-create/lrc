'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl tracking-tight block mb-8 text-center">
          LRC<span className="font-serif italic text-blood text-2xl mx-1">&</span>FORGE
        </Link>

        <div className="bg-paper border-2 border-ink p-8 hard-shadow">
          <div className="font-mono text-[10px] tracking-widest uppercase text-blood mb-2">
            // Welcome back
          </div>
          <h1 className="font-display text-4xl uppercase mb-6">Log In</h1>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-[10px] tracking-widest uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-ink px-3 py-3 font-mono text-sm bg-paper focus:outline-none focus:border-blood"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] tracking-widest uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-ink px-3 py-3 font-mono text-sm bg-paper focus:outline-none focus:border-blood"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-blood text-paper p-3 font-mono text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-blood disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Log In →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink text-center font-mono text-xs">
            New here?{' '}
            <Link href="/signup" className="text-blood font-bold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
