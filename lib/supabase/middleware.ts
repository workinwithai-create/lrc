import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  LRC_ORIGIN,
  WWA_SUPABASE_ANON_KEY,
  WWA_SUPABASE_URL,
  hasLrcAccess,
  hubLoginUrl,
  normalizeEmail,
} from '@/lib/wwa-auth';

const PROTECTED_PAGES = ['/dashboard', '/tool'];
const PUBLIC_API_PREFIXES = ['/api/stripe-webhook', '/api/waitlist'];

function copyCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/login' || pathname === '/signup') {
    const next = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const returnTo = `${LRC_ORIGIN}/auth/wwa-bridge?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(hubLoginUrl(returnTo));
  }

  if (pathname === '/pricing' || pathname.startsWith('/pricing/')) {
    return NextResponse.redirect(new URL('/membership', request.url), 308);
  }

  const isApi = pathname.startsWith('/api/');
  const isPublicApi = isApi && PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isProtectedApi = isApi && !isPublicApi;
  const isProtectedPage = PROTECTED_PAGES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtectedApi && !isProtectedPage) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const useSharedDomain =
    request.nextUrl.hostname === 'workinwithai.com' ||
    request.nextUrl.hostname.endsWith('.workinwithai.com');

  const wwa = createServerClient(WWA_SUPABASE_URL, WWA_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(
            name,
            value,
            useSharedDomain
              ? { ...options, domain: '.workinwithai.com', sameSite: 'lax', secure: true }
              : options
          );
        });
      },
    },
  });

  const { data: { user: wwaUser } } = await wwa.auth.getUser();
  if (!wwaUser) {
    if (isProtectedApi) {
      return copyCookies(
        NextResponse.json(
          {
            error: 'WorkinWithAI login required',
            reason: 'login',
            loginUrl: hubLoginUrl(`${LRC_ORIGIN}/auth/wwa-bridge?next=%2Fdashboard`),
          },
          { status: 401 }
        ),
        response
      );
    }
    const returnTo = `${LRC_ORIGIN}${pathname}${request.nextUrl.search}`;
    return copyCookies(NextResponse.redirect(hubLoginUrl(returnTo)), response);
  }

  if (!(await hasLrcAccess(wwa, wwaUser))) {
    if (isProtectedApi) {
      return copyCookies(
        NextResponse.json(
          {
            error: 'LRC Forge subscription required',
            reason: 'subscribe',
            membershipUrl: `${LRC_ORIGIN}/membership`,
          },
          { status: 402 }
        ),
        response
      );
    }
    const membership = new URL('/membership', request.url);
    membership.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return copyCookies(NextResponse.redirect(membership), response);
  }

  const lrc = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user: lrcUser } } = await lrc.auth.getUser();
  const identitiesMatch = Boolean(
    lrcUser && normalizeEmail(lrcUser.email) === normalizeEmail(wwaUser.email)
  );

  if (!identitiesMatch) {
    const bridgePath = `/auth/wwa-bridge?next=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
    if (isProtectedApi) {
      return copyCookies(
        NextResponse.json(
          {
            error: 'LRC data session required',
            reason: 'bridge',
            bridgeUrl: `${LRC_ORIGIN}${bridgePath}`,
          },
          { status: 401 }
        ),
        response
      );
    }
    return copyCookies(NextResponse.redirect(new URL(bridgePath, request.url)), response);
  }

  return response;
}
