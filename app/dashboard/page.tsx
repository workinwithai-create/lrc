import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/tool/DashboardClient';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { payment?: string };
}) {
  const supabase = await createClient();
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

  return (
    <DashboardClient
      user={user}
      profile={profile}
      songs={songs || []}
      totalCredits={null}
      paymentSuccess={searchParams.payment === 'success'}
    />
  );
}
