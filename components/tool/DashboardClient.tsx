'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Props = {
  user: any;
  profile: any;
  songs: any[];
  totalCredits: number;
  paymentSuccess?: boolean;
};

export default function DashboardClient({
  user,
  profile,
  songs,
  totalCredits,
  paymentSuccess,
}: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const isSubscribed = profile?.subscription_status === 'active';

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function downloadLRC(song: any) {
    const blob = new Blob([song.lrc_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${song.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.lrc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b-[3px] border-ink">
        <Link href="/dashboard" className="font-display text-3xl tracking-tight">
          LRC<span className="font-serif italic text-blood text-2xl mx-1">&</span>FORGE
        </Link>
        <div className="flex gap-4 items-center">
          <Link href="/pricing" className="font-mono text-xs font-bold tracking-widest uppercase hover:text-blood">
            Pricing
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="font-mono text-xs font-bold tracking-widest uppercase hover:text-blood"
          >
            {loggingOut ? '...' : 'Log Out'}
          </button>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-12">
        {paymentSuccess && (
          <div className="mb-6 bg-gold p-4 font-mono text-xs">
            ✓ Payment successful — your credits have been added.
          </div>
        )}

        {/* Status bar */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="bg-ink text-paper p-6 hard-shadow-blood">
            <div className="font-mono text-[10px] tracking-widest uppercase text-gold">
              // Credits
            </div>
            <div className="font-display text-6xl mt-2">{totalCredits}</div>
            <div className="font-serif italic text-sm text-paper/70 mt-1">
              {isSubscribed
                ? `${profile.monthly_quota_remaining} subscription + ${profile.credits} bonus`
                : 'songs available'}
            </div>
          </div>

          <div className="border-2 border-ink p-6">
            <div className="font-mono text-[10px] tracking-widest uppercase text-blood">
              // Plan
            </div>
            <div className="font-display text-3xl mt-2 uppercase">
              {isSubscribed ? 'Monthly' : profile?.credits > 0 ? 'Pay-as-you-go' : 'Free'}
            </div>
            <div className="font-serif italic text-sm text-mute mt-1">
              {isSubscribed
                ? `Renews ${profile.subscription_ends_at ? new Date(profile.subscription_ends_at).toLocaleDateString() : 'soon'}`
                : profile?.credits > 0
                ? `${profile.credits} credits remaining`
                : 'Subscribe or buy a pack'}
            </div>
          </div>

          <div className="border-2 border-ink p-6">
            <div className="font-mono text-[10px] tracking-widest uppercase text-blood">
              // Songs Generated
            </div>
            <div className="font-display text-6xl mt-2">{songs.length}</div>
            <div className="font-serif italic text-sm text-mute mt-1">all time</div>
          </div>
        </div>

        {/* Quick action */}
        <div className="mb-10">
          {totalCredits > 0 ? (
            <Link
              href="/tool"
              className="block bg-blood text-paper p-8 hard-shadow text-center hover:translate-x-1 hover:translate-y-1 transition-transform"
            >
              <div className="font-display text-5xl uppercase">Forge New LRC →</div>
              <div className="font-serif italic text-lg mt-2">
                Upload a song and get a synced .lrc file in seconds
              </div>
            </Link>
          ) : (
            <Link
              href="/pricing"
              className="block bg-ink text-paper p-8 hard-shadow-gold text-center hover:translate-x-1 hover:translate-y-1 transition-transform"
            >
              <div className="font-display text-5xl uppercase">Get Credits →</div>
              <div className="font-serif italic text-lg mt-2">
                You're out of free songs. Pick a plan to keep forging.
              </div>
            </Link>
          )}
        </div>

        {/* Songs list */}
        <div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-blood mb-3">
            // Recent Songs
          </div>
          <h2 className="font-display text-4xl uppercase mb-6">Your Catalog</h2>

          {songs.length === 0 ? (
            <div className="border-2 border-dashed border-mute p-12 text-center">
              <div className="font-serif italic text-xl text-mute">
                No songs yet. Forge your first one to see it here.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="border-2 border-ink p-4 flex items-center justify-between gap-4 bg-paper hover:hard-shadow transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-2xl uppercase truncate">{song.title}</div>
                    <div className="font-mono text-xs text-mute">
                      {song.artist} · {song.mode} mode · {song.line_count} lines ·{' '}
                      {formatDuration(song.duration_seconds || 0)} ·{' '}
                      {new Date(song.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => downloadLRC(song)}
                    className="bg-ink text-paper px-4 py-2 font-mono text-xs font-bold tracking-widest uppercase hover:bg-blood"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
