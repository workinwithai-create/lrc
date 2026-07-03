import type { SupabaseClient } from '@supabase/supabase-js';

// Phase 2 access: a user gets LRC if they own it or the Forge Pass.
// RLS limits the read to the caller's own rows, so no user id is needed.
export async function hasLrcEntitlement(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('entitlements')
    .select('product,expires_at')
    .eq('status', 'active')
    .in('product', ['lrc', 'bundle']);
  const now = Date.now();
  return (data ?? []).some((r) => !r.expires_at || new Date(r.expires_at).getTime() > now);
}
