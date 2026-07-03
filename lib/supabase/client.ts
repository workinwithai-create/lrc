import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // One login across the family: on *.workinwithai.com the session cookie is
  // scoped to the apex. Localhost and *.vercel.app previews stay host-only.
  const shared =
    typeof window !== 'undefined' && window.location.hostname.endsWith('workinwithai.com');

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    shared
      ? { cookieOptions: { domain: '.workinwithai.com', sameSite: 'lax', secure: true } }
      : undefined
  );
}
