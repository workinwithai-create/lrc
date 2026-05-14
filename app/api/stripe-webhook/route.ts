import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/stripe';
import { createAdmin } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PACK_CREDITS = 20;
const MONTHLY_QUOTA = 25;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const supabase = createAdmin();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        if (!userId) break;

        if (plan === 'pack') {
          // One-time purchase — add credits
          const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
          await supabase
            .from('profiles')
            .update({ credits: (profile?.credits || 0) + PACK_CREDITS })
            .eq('id', userId);

          await supabase.from('usage_log').insert({
            user_id: userId,
            action: 'purchase_pack',
            metadata: { session_id: session.id, credits_added: PACK_CREDITS },
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (!profile) break;

        const isActive = sub.status === 'active' || sub.status === 'trialing';

        // periodEnd is on the first subscription item
        const periodEnd = (sub as any).items?.data?.[0]?.current_period_end
          ? new Date((sub as any).items.data[0].current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from('profiles')
          .update({
            subscription_status: sub.status,
            subscription_plan: 'monthly',
            subscription_ends_at: periodEnd,
            monthly_quota_remaining: isActive ? MONTHLY_QUOTA : 0,
            monthly_quota_reset_at: periodEnd,
          })
          .eq('id', profile.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'canceled',
            monthly_quota_remaining: 0,
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.paid': {
        // Renewal — refill quota
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if ((invoice as any).billing_reason === 'subscription_cycle') {
          await supabase
            .from('profiles')
            .update({ monthly_quota_remaining: MONTHLY_QUOTA })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
