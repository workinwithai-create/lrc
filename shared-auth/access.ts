// PHASE 2 SCAFFOLD — NOT WIRED IN YET.
// The one function every app gates with. À la carte OR the Forge Pass —
// both always work: a user passes if they own this app OR the bundle.
import { supabase } from './supabase-shared';

export type Product = 'lrc' | 'release' | 'aura' | 'mix' | 'haul' | 'bundle';

export async function hasAccess(userId: string, product: Product) {
  const { data } = await supabase
    .from('entitlements')
    .select('product')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('product', [product, 'bundle']); // own app OR the Forge Pass
  return (data?.length ?? 0) > 0;
}
