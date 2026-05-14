import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as any,
  typescript: true,
});

export const STRIPE_PRICES = {
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY!, // $5/mo, 25 songs
  PACK: process.env.STRIPE_PRICE_PACK!,        // $10, 20 song credits
};
