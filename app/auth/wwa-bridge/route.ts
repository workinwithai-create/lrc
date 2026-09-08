import { NextRequest, NextResponse } from 'next/server';
import { createClient as createLrcClient, createAdmin } from '@/lib/supabase/server';
import { createWwaServerClient } from '@/lib/wwa-server';
import {
  LRC_ORIGIN,
  hasLrcAccess,
  hubLoginUrl,
  normalizeEmail,
  safeNextPath,
} from '@/lib/wwa-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function findLrcUserByEmail(email: string) {
  const admin = createAdmin();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => normalizeEmail(user.email) === email) ?? null;
}

export async function GET(request: NextRequest) {
  const nextPath = safeNextPath(request.nextUrl.searchParams.get('next'));
  const wwa = await createWwaServerClient();
  const { data: { user: wwaUser } } = await wwa.auth.getUser();

  if (!wwaUser) {
    const returnTo = `${LRC_ORIGIN}/auth/wwa-bridge?next=${encodeURIComponent(nextPath)}`;
    return NextResponse.redirect(hubLoginUrl(returnTo));
  }

  if (!(await hasLrcAccess(wwa, wwaUser))) {
    const membershipUrl = new URL('/membership', request.url);
    membershipUrl.searchParams.set('next', nextPath);
    return NextResponse.redirect(membershipUrl);
  }

  const email = normalizeEmail(wwaUser.email);
  if (!email) {
    return NextResponse.json({ error: 'Your WorkinWithAI account does not have an email address.' }, { status: 400 });
  }

  const admin = createAdmin();
  let lrcUser = await findLrcUserByEmail(email);

  if (!lrcUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { identity_source: 'workinwithai', wwa_user_id: wwaUser.id },
    });
    if (error || !data.user) {
      console.error('[WWA bridge] Could not create LRC shadow user:', error);
      return NextResponse.json({ error: 'Could not prepare your LRC Forge account.' }, { status: 500 });
    }
    lrcUser = data.user;
  }

  // Keep the old LRC database as the data store, but make the central product
  // entitlement authoritative. A very high legacy quota prevents the retired
  // credits gate from contradicting the current unlimited monthly plan.
  const { error: profileError } = await admin.from('profiles').upsert({
    id: lrcUser.id,
    email,
    subscription_status: 'active',
    subscription_plan: 'workinwithai',
    subscription_ends_at: null,
    monthly_quota_remaining: 2147480000,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });

  if (profileError) {
    console.error('[WWA bridge] Could not sync LRC access profile:', profileError);
    return NextResponse.json({ error: 'Could not prepare your LRC Forge access.' }, { status: 500 });
  }

  const lrc = await createLrcClient();
  const { data: { user: currentLrcUser } } = await lrc.auth.getUser();
  if (currentLrcUser && currentLrcUser.id !== lrcUser.id) {
    await lrc.auth.signOut({ scope: 'local' });
  }

  if (!currentLrcUser || currentLrcUser.id !== lrcUser.id) {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    const tokenHash = linkData?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error('[WWA bridge] Could not mint LRC session link:', linkError);
      return NextResponse.json({ error: 'Could not start your LRC Forge session.' }, { status: 500 });
    }

    const { error: verifyError } = await lrc.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (verifyError) {
      console.error('[WWA bridge] Could not establish LRC data session:', verifyError);
      return NextResponse.json({ error: 'Could not start your LRC Forge session.' }, { status: 500 });
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
