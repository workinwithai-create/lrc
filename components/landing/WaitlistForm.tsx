'use client';

import { useState } from 'react';

type Props = {
  feature: string;
  title: string;
  desc: string;
};

export default function WaitlistForm({ feature, title, desc }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [expanded, setExpanded] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, feature }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="border-2 border-ink p-6 bg-paper hover:hard-shadow transition-all">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="font-display text-2xl uppercase">{title}</div>
          <div className="font-serif italic text-base text-mute mt-1 leading-snug">{desc}</div>
        </div>
        <div className="font-mono text-[10px] tracking-widest uppercase text-gold border border-gold px-2 py-1">
          Soon
        </div>
      </div>

      {!expanded && status !== 'done' ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 font-mono text-xs font-bold tracking-widest uppercase text-blood hover:underline"
        >
          → Join waitlist
        </button>
      ) : status === 'done' ? (
        <div className="mt-4 font-mono text-xs tracking-widest uppercase text-ink">
          ✓ You're on the list
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            className="flex-1 border-2 border-ink px-3 py-2 font-mono text-sm bg-paper focus:outline-none focus:border-blood"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="bg-ink text-paper px-4 py-2 font-mono text-xs font-bold tracking-widest uppercase hover:bg-blood disabled:opacity-50"
          >
            {status === 'loading' ? '...' : 'Join'}
          </button>
        </form>
      )}

      {status === 'error' && (
        <div className="mt-2 font-mono text-xs text-blood">Something went wrong. Try again.</div>
      )}
    </div>
  );
}
