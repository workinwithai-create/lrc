'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Phase 2: billing consolidated onto the WorkinWithAI hub (one Stripe
// account, one customer per user). This page hands off instead of checking out.
const HUB_PRICING = 'https://workinwithai.com/#pricing';

function PricingContent() {
  const searchParams = useSearchParams();
  const canceled = searchParams.get('payment') === 'cancel';

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
            One account. Every tool.
          </h1>
          <p className="font-serif italic text-xl text-mute mt-4">
            LRC Forge now runs on your WorkinWithAI account.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="border-2 border-ink p-8 hard-shadow bg-paper">
            <div className="font-mono text-xs tracking-widest uppercase text-mute">Subscription</div>
            <div className="font-display text-4xl uppercase mt-1">LRC Forge</div>
            <div className="flex items-baseline gap-2 mt-6">
              <span className="font-display text-7xl">$9</span>
              <span className="font-serif italic text-mute">/ month</span>
            </div>
            <div className="font-mono text-xs text-mute mt-1">unlimited songs · cancel anytime</div>
            <ul className="mt-8 space-y-3 font-serif text-lg">
              <li><span className="text-blood font-bold">→</span> Unlimited .lrc generations</li>
              <li><span className="text-blood font-bold">→</span> Smart or Strict mode</li>
              <li><span className="text-blood font-bold">→</span> One login across every Forge tool</li>
            </ul>
            <a
              href={HUB_PRICING}
              className="mt-8 block w-full bg-ink text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-blood transition-colors text-center"
            >
              Get it on WorkinWithAI →
            </a>
          </div>

          <div className="border-2 border-ink p-8 hard-shadow-blood bg-paper relative">
            <div className="absolute -top-3 left-4 bg-blood text-paper px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
              Best Value
            </div>
            <div className="font-mono text-xs tracking-widest uppercase text-mute">Everything</div>
            <div className="font-display text-4xl uppercase mt-1">The Forge Pass</div>
            <div className="flex items-baseline gap-2 mt-6">
              <span className="font-display text-7xl">$24</span>
              <span className="font-serif italic text-mute">/ month</span>
            </div>
            <div className="font-mono text-xs text-mute mt-1">all five Forge tools · one bill</div>
            <ul className="mt-8 space-y-3 font-serif text-lg">
              <li><span className="text-blood font-bold">→</span> LRC Forge included</li>
              <li><span className="text-blood font-bold">→</span> Record → polish → master → release → present</li>
              <li><span className="text-blood font-bold">→</span> New Forge tools as they ship</li>
            </ul>
            <a
              href={HUB_PRICING}
              className="mt-8 block w-full bg-blood text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-ink transition-colors text-center"
            >
              Get the Forge Pass →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function PricingPage() {
  return <Suspense><PricingContent /></Suspense>;
}
