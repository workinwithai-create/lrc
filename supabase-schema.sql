-- ============================================
-- LRC Forge — Supabase Schema
-- Run this in the Supabase SQL Editor.
-- ============================================

-- Users extension: track subscription + credits
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  stripe_customer_id text UNIQUE,
  subscription_status text DEFAULT 'free',   -- 'free' | 'active' | 'canceled' | 'past_due'
  subscription_plan text,                     -- 'monthly' | null
  subscription_ends_at timestamptz,
  credits integer DEFAULT 1,                  -- free songs remaining
  monthly_quota_remaining integer DEFAULT 0,  -- resets each billing period
  monthly_quota_reset_at timestamptz,
  is_admin boolean DEFAULT false,             -- unlimited access, never decremented
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, credits)
  VALUES (new.id, new.email, 1);  -- 1 free song to try
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Songs & timings
-- ============================================

CREATE TABLE IF NOT EXISTS public.songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  duration_seconds numeric,
  mode text DEFAULT 'smart',     -- 'smart' | 'strict'
  lrc_content text,
  word_count integer,
  line_count integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_songs_user_id ON public.songs(user_id);
CREATE INDEX idx_songs_created ON public.songs(created_at DESC);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own songs"
  ON public.songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own songs"
  ON public.songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own songs"
  ON public.songs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Waitlist for future features
-- ============================================

CREATE TABLE IF NOT EXISTS public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  feature text NOT NULL,   -- 'karaoke' | 'video' | 'timing' | 'snippets' | 'structure'
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(email, feature)
);

CREATE INDEX idx_waitlist_feature ON public.waitlist(feature);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Usage ledger (for analytics + debugging)
-- ============================================

CREATE TABLE IF NOT EXISTS public.usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,      -- 'generate_lrc' | 'purchase_pack' | 'subscribe'
  metadata jsonb,
  cost_cents integer,         -- our cost (for internal tracking)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_usage_user ON public.usage_log(user_id);
CREATE INDEX idx_usage_action ON public.usage_log(action);
