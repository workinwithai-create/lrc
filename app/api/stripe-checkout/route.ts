import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES } from '@/lib/stripe/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { plan } = await req.json();
    if (plan !== 'monthly' && plan !== 'pack') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    const priceId = plan === 'monthly' ? STRIPE_PRICES.MONTHLY : STRIPE_PRICES.PACK;
    const mode = plan === 'monthly' ? 'subscription' : 'payment';

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lrcforge.workinwithai.com';
    console.log('[checkout] plan:', plan, 'priceId:', priceId, 'baseUrl:', baseUrl, 'userId:', user.id);

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[checkout] profile lookup failed:', profileError.message);
      return NextResponse.json({ error: 'Profile not found' }, { status: 500 });
    }

    console.log('[checkout] profile found, customerId:', profile?.stripe_customer_id ?? 'none');

    let customerId = profile?.stripe_customer_id;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
        console.log('[checkout] existing customer verified:', customerId);
      } catch (e: any) {
        console.log('[checkout] stale customer, clearing:', e.message);
        customerId = null;
        await supabase.from('profiles').update({ stripe_customer_id: null }).eq('id', user.id);
      }
    }

    if (!customerId) {
      console.log('[checkout] creating new Stripe customer');
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      console.log('[checkout] customer created:', customerId);
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    console.log('[checkout] creating session with price:', priceId);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/pricing?payment=cancel`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    });

    console.log('[checkout] session created:', session.id, 'url:', session.url ? 'OK' : 'NULL');
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] FATAL:', err.message, '| type:', err.type, '| code:', err.code);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
