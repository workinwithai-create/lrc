import Link from 'next/link';
import WaitlistForm from '@/components/landing/WaitlistForm';

// Billing is on the WorkinWithAI hub — same destination as /pricing.
const HUB_PRICING = 'https://workinwithai.com/#pricing';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b-[3px] border-ink">
        <div className="font-display text-3xl tracking-tight">
          LRC<span className="font-serif italic text-blood text-2xl mx-1">&</span>FORGE
        </div>
        <div className="flex gap-3 items-center">
          <Link href="/login" className="font-mono text-xs font-bold tracking-widest uppercase hover:text-blood">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-ink text-paper px-4 py-2 font-display text-sm tracking-wider uppercase hover:bg-blood transition-colors"
          >
            Start Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <div className="grid md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-8">
            <div className="font-serif italic text-xl text-blood mb-2">
              An indie artist's lyric timing toolkit
            </div>
            <h1 className="font-display text-6xl md:text-8xl lg:text-9xl leading-[0.85] tracking-tight uppercase">
              Lyrics,<br />
              <span className="text-blood">Synced</span><br />
              In Seconds.
            </h1>
            <p className="font-serif italic text-2xl mt-8 max-w-xl border-t-2 border-ink pt-6">
              <span className="text-blood font-bold">—</span> Upload a song. Get a perfect, Whisper-powered <strong className="font-bold not-italic">.lrc</strong> file
              ready for Smule, karaoke apps, or lyric videos.
            </p>

            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <Link
                href="/signup"
                className="bg-blood text-paper px-8 py-5 font-display text-2xl tracking-wider uppercase hard-shadow hover:translate-x-1 hover:translate-y-1 transition-transform inline-block"
              >
                Try It Free →
              </Link>
              <span className="font-mono text-xs text-mute">
                1 free song · no credit card
              </span>
            </div>
          </div>

          <div className="md:col-span-4 md:mt-20">
            <div className="bg-ink text-paper p-6 hard-shadow-blood">
              <div className="font-mono text-[10px] tracking-widest text-gold uppercase mb-3">
                // Sample Output
              </div>
              <pre className="font-mono text-xs leading-loose text-paper whitespace-pre-wrap">
<span className="text-blood">[ti:Coal Cover]
[ar:Mark Parsons Jr.]
[length:03:42]</span>

<span className="text-gold">[00:08.40]</span>I was born in the dust
<span className="text-gold">[00:12.15]</span>Where the coal dust falls
<span className="text-gold">[00:16.22]</span>Through the cracks in the walls
<span className="text-gold">[00:20.85]</span>Of my daddy's house
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink text-paper py-20 border-y-[3px] border-ink">
        <div className="max-w-6xl mx-auto px-6">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-gold mb-3">
            // How It Works
          </div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none mb-12">
            Three steps.<br />
            <span className="text-gold">Real</span> sync.
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Upload', desc: 'Drop your MP3, WAV, or M4A. Works right from your phone.' },
              { n: '02', title: 'Transcribe', desc: "OpenAI Whisper listens to every word and captures exact timestamps." },
              { n: '03', title: 'Forge', desc: 'Download a Smule-ready .lrc file. Or use your own lyrics for smart alignment.' },
            ].map((step) => (
              <div key={step.n} className="border-2 border-paper p-6">
                <div className="font-display text-7xl text-gold leading-none mb-4">{step.n}</div>
                <div className="font-mono text-xs tracking-widest uppercase mb-3 text-gold">{step.title}</div>
                <div className="font-serif italic text-lg leading-snug">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20" id="pricing">
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-blood mb-3">
          // Pricing
        </div>
        <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none mb-12">
          Pay how you<br />play.
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
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
              className="mt-8 block text-center bg-ink text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-blood transition-colors"
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
              className="mt-8 block text-center bg-blood text-paper py-4 font-display text-xl tracking-wider uppercase hover:bg-ink transition-colors"
            >
              Get the Forge Pass →
            </a>
          </div>
        </div>

        <div className="text-center mt-8 font-mono text-xs text-mute">
          Every new account gets <strong className="text-ink">1 free song</strong> to try it out.
        </div>
      </section>

      {/* Coming soon - waitlist */}
      <section className="bg-paper border-t-[3px] border-ink py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-blood mb-3">
            // Roadmap
          </div>
          <h2 className="font-display text-5xl md:text-7xl uppercase tracking-tight leading-none mb-6">
            More coming.<br />
            <span className="text-blood italic font-serif">Get first access.</span>
          </h2>
          <p className="font-serif italic text-xl text-mute max-w-2xl mb-12">
            LRC is step one. Here's what's being built next — join any waitlist to be notified when it ships.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                feature: 'karaoke',
                title: 'Karaoke Player',
                desc: 'Practice your songs in-app with word-by-word highlighting and loop sections.',
              },
              {
                feature: 'video',
                title: 'Lyric Video Generator',
                desc: 'Auto-render MP4 lyric videos with custom templates. YouTube-ready.',
              },
              {
                feature: 'timing',
                title: 'Vocal Timing Coach',
                desc: 'See exactly where you rush or drag against the beat. Tighten your phrasing.',
              },
              {
                feature: 'snippets',
                title: 'Hook Extractor',
                desc: 'Auto-find the best 15-30 second clips for TikTok, Reels, and Shorts.',
              },
              {
                feature: 'structure',
                title: 'Song Structure Mapper',
                desc: 'Auto-label verse, chorus, bridge. Find the "money moment" for promo.',
              },
            ].map((item) => (
              <WaitlistForm key={item.feature} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-[3px] border-ink py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-mono text-[10px] tracking-widest uppercase text-mute">
            © 2026 · Mark Parsons Jr. · Monterey, CA
          </div>
          <div className="flex gap-6 font-mono text-[10px] tracking-widest uppercase">
            <Link href="/pricing" className="hover:text-blood">Pricing</Link>
            <Link href="/login" className="hover:text-blood">Log In</Link>
            <a href="mailto:hello@lrcforge.com" className="hover:text-blood">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
