import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/tool/DashboardClient';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { payment?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const { data: songs } = await supabase
    .from('songs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  const totalCredits =
    (profile?.subscription_status === 'active'
      ? (profile?.monthly_quota_remaining ?? 0)
      : 0) + (profile?.credits ?? 0);

  return (
    <DashboardClient
      user={user}
      profile={profile}
      songs={songs || []}
      totalCredits={totalCredits}
      paymentSuccess={searchParams.payment === 'success'}
    />
  );
}
