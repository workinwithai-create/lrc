# LRC Forge

A standalone, paid web product for indie artists. Upload a song, get a perfectly synced `.lrc` file powered by OpenAI Whisper. Built with Next.js 14, Supabase, Stripe, and Tailwind CSS.

---

## What You're Shipping

- ✅ **Landing page** — pitches the full vision with waitlist signups for future features
- ✅ **Auth system** — email/password via Supabase
- ✅ **Paid LRC generation** — $5/mo subscription OR $10 one-time pack
- ✅ **User dashboard** — song catalog, credit balance, download history
- ✅ **Stripe integration** — subscriptions + one-time purchases + webhook sync
- ✅ **Waitlist capture** — 5 future features with email collection
- ✅ **Mobile-first design** — works on phone for uploading Suno tracks

---

## Setup (about 90 minutes end-to-end)

### 1. Install dependencies

```bash
cd lrc-forge
npm install
```

### 2. Create a Supabase project

- Go to https://app.supabase.com → New Project
- Once it's ready, go to SQL Editor → paste the contents of `supabase-schema.sql` → Run
- Go to Settings → API → copy URL, anon key, service_role key into `.env.local`
- Go to Authentication → Providers → make sure Email is enabled
- (Optional) Authentication → URL Configuration → set Site URL to your production domain

### 3. Set up OpenAI

- Go to https://platform.openai.com/api-keys → Create new key
- Add $5–10 of credit to your account (more than enough to start)
- Copy key into `.env.local` as `OPENAI_API_KEY`

### 4. Set up Stripe

1. Create Stripe account at https://dashboard.stripe.com
2. In Products → **Add product** twice:
   - **Monthly Subscription**: $5/month recurring → save Price ID as `STRIPE_PRICE_MONTHLY`
   - **Song Pack**: $10 one-time → save Price ID as `STRIPE_PRICE_PACK`
3. Copy your Secret Key → `STRIPE_SECRET_KEY`
4. Set up webhook (next section)

### 5. Stripe webhooks

For local dev, use Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe-webhook
# Copy the `whsec_...` it prints into STRIPE_WEBHOOK_SECRET
```

For production (after deploying):

- Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://yourdomain.com/api/stripe-webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET` in Vercel env

### 6. Fill in `.env.local`

Copy `.env.example` to `.env.local` and fill in every variable.

### 7. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 8. Test the flow

1. Sign up with an email
2. You get 1 free credit automatically
3. Go to /tool → upload a short test MP3 → verify LRC generates
4. Go to /pricing → test Stripe checkout (use test card 4242 4242 4242 4242)
5. Verify webhook fires and credits update

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → Import repository
3. Add all env variables from `.env.local` to Vercel project settings
4. Deploy
5. Update `NEXT_PUBLIC_SITE_URL` to your live URL
6. Update Stripe webhook endpoint to your live URL
7. Update Supabase Auth → Site URL + Redirect URLs to your live URL

---

## Architecture

```
/app
  /api
    /generate-lrc      POST - runs Whisper, decrements credits, saves song
    /stripe-checkout   POST - creates Stripe session
    /stripe-webhook    POST - syncs payment events to Supabase
    /waitlist          POST - captures feature waitlist emails
  /dashboard           User dashboard (auth required)
  /tool                LRC generation UI (auth + credits required)
  /login               Sign in
  /signup              Create account (gets 1 free credit)
  /pricing             Stripe checkout buttons
  page.tsx             Landing page

/lib
  /supabase            Server + client + middleware
  /stripe              Stripe client + price ID constants

/components
  /landing             WaitlistForm
  /tool                DashboardClient, ToolClient
```

---

## Economics

**Your cost per song:**
- Whisper: ~$0.02 (for a 3-min song at $0.006/min)
- Infrastructure: ~$0 at low scale (Vercel free tier, Supabase free tier covers it)

**Your revenue per song:**
- Monthly subscriber: ~$0.20/song ($5 / 25 songs)
- Pack buyer: $0.50/song ($10 / 20 songs)

**Margins:**
- Monthly: ~90% margin
- Pack: ~96% margin

You can offer more generous quotas as volume grows.

---

## What's NOT built (intentionally)

These are on the roadmap and live as waitlist items:

1. Karaoke Player
2. Lyric Video Generator
3. Vocal Timing Coach
4. Hook Extractor
5. Song Structure Mapper

Don't build these until paying users ask. Watch the waitlist table in Supabase to see what's most requested.

---

## File size & Whisper limits

- OpenAI Whisper accepts files up to 25MB
- The app enforces this limit at upload time
- For longer songs (rare in music), you'd need chunking logic — not built yet

---

## Troubleshooting

**"Not authenticated" on /tool**
- Session cookie isn't being set. Check that middleware.ts is in the root of the project.

**Stripe webhook signature fails**
- `STRIPE_WEBHOOK_SECRET` mismatch. Use `stripe listen` for local dev.

**"Out of credits" loop**
- After payment, if credits don't update, check the webhook is firing (Stripe dashboard → Webhooks → Recent deliveries)

**Whisper returns no words**
- Audio might be pure instrumental. Whisper won't hallucinate lyrics from silence — this is correct behavior.

**Mobile file picker grayed out (iOS + Suno)**
- iOS restriction. Users need to first Save to Files from Suno, then pick from Files app.

---

## Next steps

1. Get auth working (Supabase + Stripe test flow)
2. Deploy to Vercel
3. Share the URL with 5 indie artists you know
4. Watch the waitlist table to see what features they want next
5. Build the top-voted feature

Good luck. This is real software now — treat it like a business.
