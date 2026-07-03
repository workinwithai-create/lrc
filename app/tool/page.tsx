import { createClient } from '@/lib/supabase/server';
import { hasLrcEntitlement } from '@/lib/entitlements';
import { redirect } from 'next/navigation';
import ToolClient from '@/components/tool/ToolClient';

export default async function ToolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/tool');

  // Forge Pass / LRC subscribers (entitlements) get in regardless of credits.
  const entitled = await hasLrcEntitlement(supabase);

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const totalCredits =
    (profile?.subscription_status === 'active'
      ? profile.monthly_quota_remaining
      : 0) + (profile?.credits || 0);

  if (!entitled && totalCredits <= 0) {
    redirect('/pricing');
  }

  return <ToolClient user={user} totalCredits={entitled ? Math.max(totalCredits, 999) : totalCredits} />;
}
