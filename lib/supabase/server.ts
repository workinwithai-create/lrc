import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Production serves lrc.workinwithai.com — scope the session cookie to the
// apex there so the login is shared family-wide. Previews/dev stay host-only.
const sharedCookieOptions =
  process.env.VERCEL_ENV === 'production'
    ? { domain: '.workinwithai.com', sameSite: 'lax' as const, secure: true }
    : undefined;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: sharedCookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component context — ignore
          }
        },
      },
    }
  );
}

// Admin client (service role) for webhooks and server-only operations
import { createClient as createAdminClient } from '@supabase/supabase-js';

export function createAdmin() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error('Missing Supabase service role key');
  }

  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } }
  );
}
