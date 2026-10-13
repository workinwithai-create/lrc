import { redirect } from 'next/navigation';
import { createWwaServerClient } from '@/lib/wwa-server';
import { createClient as createLrcClient } from '@/lib/supabase/server';
import { hasLrcAccess } from '@/lib/wwa-auth';
import ToolClient from '@/components/tool/ToolClient';
import PreviewSignIn from '@/components/tool/PreviewSignIn';

/**
 * This preview must exercise the real transcription backend, not just
 * the standalone audio playback/timestamp editor. Authenticated members
 * upload audio using the same signed storage and Whisper API as /tool.
 */
export default async function TimingPreviewPage() {
  const wwa = await createWwaServerClient();
  const { data: { user: wwaUser } } = await wwa.auth.getUser();

  if (!wwaUser) return <PreviewSignIn />;

  if (!(await hasLrcAccess(wwa, wwaUser))) {
    return (
      <main className="max-w-xl mx-auto p-8 space-y-4">
        <h1 className="font-display text-4xl uppercase">LRC Forge membership required</h1>
        <p>The preview runs real Whisper transcription and follows the same WorkinWithAI membership rules as production.</p>
        <a className="underline" href="https://lrcforge.workinwithai.com/membership">See LRC Forge access</a>
      </main>
    );
  }

  const lrc = await createLrcClient();
  const { data: { user: lrcUser } } = await lrc.auth.getUser();
  if (!lrcUser || lrcUser.email?.toLowerCase() !== wwaUser.email?.toLowerCase()) {
    redirect('/auth/wwa-bridge?next=%2Ftiming-preview');
  }

  return <ToolClient user={lrcUser} totalCredits={null} />;
}
