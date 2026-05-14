'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const canceled = searchParams.get('payment') === 'cancel';

  async function handleCheckout(plan: 'monthly' | 'pack') {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (res.status === 401) {
        window.location.href = `/login?redirect=/pricing&plan=${plan}`;
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Checkout failed');
      }
    } catch (err: any) {
      alert(err.message);
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen">
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b-[3px] border-ink">
        <Link href="/" className="font-display text-3xl tracking-tight">
          LRC<span className="font-serif italic text-blood text-2xl mx-1">&</span>FORGE
        </Link>
        <Link href="/dashboard" className="font-mono text-xs font-bold tracking-widest uppercase hover:text-blood">
          Dashboard
        </Link>
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-16">
        {canceled && (
          <div className="mb-8 bg-gold p-4 font-mono text-xs">
            Payment canceled. No charges were made.
          </div>
        )}

        <div className="text-center mb-12">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-blood mb-3">
            // Pricing
          </div>
          <h1 className="font-display text-6xl md:text-8xl uppercase tracking-tight leading-none">
            Choose a plan.
          </h1>
          <p className="font-serif italic text-xl text-mute mt-4">
            Cancel or swap anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Pack */}
          <div className="border-2 border-ink p-8 hard-shadow bg-paper">
            <div className="font-mono text-xs tracking-widest uppercase text-mute">One-time</div>
            <div className="font-display text-4xl uppercase mt-1">Song Pack</div>
            <div className="flex items-baseline gap-2 mt-6">
              <span className="font-display text-7xl">$10</span>
              <span className="font-serif italic text-mute">/ 20 songs</span>
            </div>
            <div className="font-mono text-xs text-mute mt-1">50¢ per song · never expires</div>
            <ul className="mt-8 space-y-3 font-serif text-lg">
              <li><span className="text-blood font-bold">→</span> 20 .lrc generations</li>
              <li><span className="text-blood font-bold">→</span> Smart or Strict mode</li>
              <li><span className="text-blood font-bold">→</span> No subscription</li>
              <li><span className="text-blood font-bold">→</span> Credits never expire</li>
            </ul>
            <button
              onClick={() => handleCheckout('pack')}
              disabled={loading !== null}
              className="mt-8 w-full bg-ink text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-blood disabled:opacity-50 transition-colors"
            >
              {loading === 'pack' ? 'Loading...' : 'Buy Pack →'}
            </button>
          </div>

          {/* Monthly */}
          <div className="border-2 border-ink p-8 hard-shadow-blood bg-paper relative">
            <div className="absolute -top-3 left-4 bg-blood text-paper px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
              Best Value
            </div>
            <div className="font-mono text-xs tracking-widest uppercase text-mute">Subscription</div>
            <div className="font-display text-4xl uppercase mt-1">Monthly</div>
            <div className="flex items-baseline gap-2 mt-6">
              <span className="font-display text-7xl">$5</span>
              <span className="font-serif italic text-mute">/ month</span>
            </div>
            <div className="font-mono text-xs text-mute mt-1">20¢ per song · cancel anytime</div>
            <ul className="mt-8 space-y-3 font-serif text-lg">
              <li><span className="text-blood font-bold">→</span> 25 songs per month</li>
              <li><span className="text-blood font-bold">→</span> Smart or Strict mode</li>
              <li><span className="text-blood font-bold">→</span> Priority processing</li>
              <li><span className="text-blood font-bold">→</span> Early access to new tools</li>
            </ul>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="mt-8 w-full bg-blood text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-ink disabled:opacity-50 transition-colors"
            >
              {loading === 'monthly' ? 'Loading...' : 'Subscribe →'}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
