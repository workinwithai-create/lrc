import type { SupabaseClient, User } from '@supabase/supabase-js';

export const WWA_SUPABASE_URL =
  process.env.NEXT_PUBLIC_WWA_SUPABASE_URL || 'https://kldstbhnpwpvvubphnas.supabase.co';

// Public anon key for the WorkinWithAI identity project. Database privileges
// remain controlled by RLS; this is not a service-role secret.
export const WWA_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_WWA_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsZHN0YmhucHdwdnZ1YnBobmFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwODMwNTQsImV4cCI6MjA4ODY1OTA1NH0.g2VAAPpjvBpfO-rpe83-SiLgeR7-pznZrvh8ihkTQCo';

export const WWA_HUB_ORIGIN = 'https://workinwithai.com';
export const LRC_ORIGIN = 'https://lrcforge.workinwithai.com';

const FOUNDER_EMAILS = new Set([
  'markparsonsjrmusic@gmail.com',
  'mpjrecords90@gmail.com',
  'workinwithai@gmail.com',
]);

export function normalizeEmail(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

export function isWwaPrivilegedEmail(email?: string | null) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return FOUNDER_EMAILS.has(normalized) || normalized.endsWith('@workinwithai.com');
}

export async function hasLrcAccess(client: SupabaseClient, user: User) {
  if (isWwaPrivilegedEmail(user.email)) return true;

  const { data, error } = await client
    .from('entitlements')
    .select('product,status,expires_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('product', ['lrc', 'bundle']);

  if (error) {
    console.error('[WWA auth] LRC entitlement lookup failed:', error);
    return false;
  }

  return (data ?? []).some((row) => {
    if (!row.expires_at) return true;
    const expiry = new Date(row.expires_at).getTime();
    return Number.isFinite(expiry) && expiry > Date.now();
  });
}

export function safeNextPath(value: string | null | undefined, fallback = '/dashboard') {
  const next = String(value || '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.startsWith('/auth/wwa-bridge')) return fallback;
  return next;
}

export function hubLoginUrl(returnTo = `${LRC_ORIGIN}/auth/wwa-bridge?next=%2Fdashboard`) {
  return `${WWA_HUB_ORIGIN}/login?next=${encodeURIComponent(returnTo)}`;
}
