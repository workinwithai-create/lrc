import Link from 'next/link';
import FeatureStudio from '@/components/tool/FeatureStudio';

export default function WorkshopPage() {
  return <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
    <nav className="flex flex-wrap gap-3 items-center justify-between border-b-2 border-ink pb-5">
      <Link href="/" className="font-display text-3xl uppercase">← LRC Forge</Link>
      <Link href="/tool" className="bg-blood text-paper px-4 py-3 font-display uppercase">Generate timed lyrics →</Link>
    </nav>
    <FeatureStudio/>
    <p className="font-serif italic text-mute text-center">The creative workshop works with existing .lrc files and audio right in your browser. Audio does not leave your device.</p>
  </main>;
}
