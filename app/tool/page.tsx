import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ToolClient from '@/components/tool/ToolClient';

export default async function ToolPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/tool');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const totalCredits =
    (profile?.subscription_status === 'active'
      ? profile.monthly_quota_remaining
      : 0) + (profile?.credits || 0);

  if (totalCredits <= 0) {
    redirect('/pricing');
  }

  return <ToolClient user={user} totalCredits={totalCredits} />;
}
