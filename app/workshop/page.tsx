import Link from 'next/link';
import FeatureStudio from '@/components/tool/FeatureStudio';

type Feature = 'karaoke'|'video'|'timing'|'snippets'|'structure';
export default async function WorkshopPage({searchParams}:{searchParams:Promise<{feature?:string}>}) {
  const {feature}=await searchParams;
  const known=['karaoke','video','timing','snippets','structure'];
  const initialTab=(known.includes(feature||'')?feature:'karaoke') as Feature;
  return <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-7">
    <nav className="flex flex-wrap gap-3 items-center justify-between border-b-2 border-ink pb-5">
      <Link href="/" className="font-display text-3xl uppercase">← LRC Forge</Link>
      <Link href="/tool" className="bg-blood text-paper px-4 py-3 font-display uppercase">Generate timed lyrics →</Link>
    </nav>
    <FeatureStudio initialTab={initialTab}/>
    <p className="font-serif italic text-mute text-center">The creative workshop works with existing .lrc files and audio right in your browser. Audio does not leave your device.</p>
  </main>;
}
