import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ToolClient from '@/components/tool/ToolClient';

export default async function ToolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/tool');

  // Product access is enforced by the WorkinWithAI proxy. The local profile
  // remains the data/usage record, not a second billing authority.
  return <ToolClient user={user} totalCredits={null} />;
}
