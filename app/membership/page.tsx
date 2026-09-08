'use client';

import { useState } from 'react';

const HUB_ORIGIN = 'https://workinwithai.com';
const LRC_ORIGIN = 'https://lrcforge.workinwithai.com';
type Plan = 'lrc-monthly' | 'forge-pass-monthly';

export default function MembershipPage() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState('');

  async function checkout(lookupKey: Plan) {
    setLoading(lookupKey);
    setError('');
    try {
      const response = await fetch(`${HUB_ORIGIN}/api/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey, returnTo: LRC_ORIGIN }),
      });

      if (response.status === 401) {
        window.location.href = `${HUB_ORIGIN}/login?next=${encodeURIComponent(`${LRC_ORIGIN}/membership`)}`;
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        setError(data.error || 'Checkout could not start. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Checkout could not start. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink p-6 sm:p-12">
      <div className="mx-auto max-w-4xl">
        <a href={HUB_ORIGIN} className="font-mono text-xs uppercase tracking-widest text-blood">WorkinWithAI</a>
        <div className="mt-8 max-w-2xl">
          <div className="font-mono text-xs uppercase tracking-widest text-blood">// LRC Forge membership</div>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl uppercase">One login. Pick your access.</h1>
          <p className="mt-5 text-lg leading-8">Your WorkinWithAI account works here. LRC Forge is $9/month with unlimited generations, or it is included in Forge Pass.</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <section className="border-2 border-ink bg-paper p-7 hard-shadow">
            <div className="font-mono text-xs uppercase tracking-widest text-blood">LRC Forge</div>
            <div className="mt-4 font-display text-5xl">$9<span className="font-mono text-sm"> / month</span></div>
            <p className="mt-4 leading-7">Unlimited LRC generations, Smart and Strict modes, and your existing saved song history.</p>
            <button onClick={() => checkout('lrc-monthly')} disabled={loading !== null} className="mt-7 w-full bg-ink text-paper py-4 font-display text-xl uppercase disabled:opacity-50">
              {loading === 'lrc-monthly' ? 'Opening checkout…' : 'Get LRC Forge →'}
            </button>
          </section>

          <section className="border-2 border-ink bg-ink text-paper p-7">
            <div className="font-mono text-xs uppercase tracking-widest text-blood">Forge Pass</div>
            <div className="mt-4 font-display text-5xl">$24<span className="font-mono text-sm"> / month</span></div>
            <p className="mt-4 leading-7 text-zinc-300">LRC Forge, Release Forge, AuraMix, and MixForge under the same WorkinWithAI account.</p>
            <button onClick={() => checkout('forge-pass-monthly')} disabled={loading !== null} className="mt-7 w-full bg-paper text-ink py-4 font-display text-xl uppercase disabled:opacity-50">
              {loading === 'forge-pass-monthly' ? 'Opening checkout…' : 'Get Forge Pass →'}
            </button>
          </section>
        </div>

        {error && <p className="mt-6 border-2 border-blood bg-blood text-paper p-3 font-mono text-sm">{error}</p>}
        <p className="mt-8 font-mono text-xs">Already subscribed? <a className="text-blood underline" href="/auth/wwa-bridge?next=%2Fdashboard">Continue to LRC Forge</a>.</p>
      </div>
    </main>
  );
}
