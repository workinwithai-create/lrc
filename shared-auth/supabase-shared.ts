// PHASE 2 SCAFFOLD — NOT WIRED IN YET.
// The future shared client: one login across every *.workinwithai.com app.
// Cutover happens in the supervised Phase 2 session (see WHATS-NEXT.md).
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookieOptions: {
      domain: '.workinwithai.com', // one login across every subdomain
      sameSite: 'lax',
      secure: true,
    },
  }
);
