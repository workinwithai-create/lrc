import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { WWA_SUPABASE_ANON_KEY, WWA_SUPABASE_URL } from './wwa-auth';

type CookieUpdate = { name: string; value: string; options?: any };

export async function createWwaServerClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const host = (headerStore.get('host') || '').split(':')[0].toLowerCase();
  const useSharedDomain = host === 'workinwithai.com' || host.endsWith('.workinwithai.com');

  return createServerClient(WWA_SUPABASE_URL, WWA_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieUpdate[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(
              name,
              value,
              useSharedDomain
                ? { ...options, domain: '.workinwithai.com', sameSite: 'lax', secure: true }
                : options
            );
          });
        } catch {
          // Proxy handles cookie refresh while rendering server components.
        }
      },
    },
  });
}
