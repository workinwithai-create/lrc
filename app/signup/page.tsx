'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Auto-redirect based on chosen plan
    if (plan) {
      router.push(`/pricing?plan=${plan}`);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl tracking-tight block mb-8 text-center">
          LRC<span className="font-serif italic text-blood text-2xl mx-1">&</span>FORGE
        </Link>

        <div className="bg-paper border-2 border-ink p-8 hard-shadow-blood">
          <div className="font-mono text-[10px] tracking-widest uppercase text-blood mb-2">
            // Start here
          </div>
          <h1 className="font-display text-4xl uppercase mb-2">Create Account</h1>
          <p className="font-serif italic text-mute mb-6">
            One free song to try. No credit card needed.
          </p>

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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-ink px-3 py-3 font-mono text-sm bg-paper focus:outline-none focus:border-blood"
                autoComplete="new-password"
              />
              <div className="font-mono text-[10px] text-mute mt-1">8+ characters</div>
            </div>

            {error && (
              <div className="bg-blood text-paper p-3 font-mono text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blood text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-ink disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Account →'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-ink text-center font-mono text-xs">
            Already have an account?{' '}
            <Link href="/login" className="text-blood font-bold hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>;
}
