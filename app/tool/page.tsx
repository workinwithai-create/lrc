import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ToolClient from '@/components/tool/ToolClient';
import { remainingCredits } from '@/lib/owner-access';

export default async function ToolPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/tool');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const totalCredits = remainingCredits(profile, user.email);

  if (totalCredits !== null && totalCredits <= 0) {
    redirect('/pricing');
  }

  return <ToolClient user={user} totalCredits={totalCredits} />;
}
