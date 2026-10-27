-- backend/supabase/migrations/039_premium.sql
-- HL-084: HeartLink Premium. Each patient's plan lives on their profile; Premium lasts until premium_until (worked
-- out on read, no expiry job). premium_config holds the one set of plan settings admins edit in the portal, and
-- premium_events records every change (trial, demo checkout, admin give/remove). Checkout is a demo that pays once
-- for a month or a year (no auto-renew), and no payment details are stored anywhere. Backend only, like every table
-- since 020. Safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_source text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used_at timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'premium'));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_premium_source_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_premium_source_check
    CHECK (premium_source IS NULL OR premium_source IN ('trial', 'checkout', 'admin'));

COMMENT ON COLUMN public.profiles.plan IS 'free or premium; Premium counts only while premium_until is in the future';
COMMENT ON COLUMN public.profiles.premium_until IS 'When Premium ends (trial, demo checkout or given by an admin)';
COMMENT ON COLUMN public.profiles.trial_used_at IS 'When the one free trial was started (null: still available)';

-- One row (id = 1) of plan settings; prices in whole pesos.
CREATE TABLE IF NOT EXISTS public.premium_config (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    monthly_price_php integer NOT NULL DEFAULT 99 CHECK (monthly_price_php BETWEEN 0 AND 100000),
    yearly_price_php integer NOT NULL DEFAULT 899 CHECK (yearly_price_php BETWEEN 0 AND 1000000),
    trial_days integer NOT NULL DEFAULT 7 CHECK (trial_days BETWEEN 0 AND 90),
    checkout_enabled boolean NOT NULL DEFAULT true,
    updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.premium_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.premium_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('trial_started', 'checkout', 'admin_granted', 'admin_removed')),
    period text CHECK (period IS NULL OR period IN ('monthly', 'yearly', 'trial', 'custom')),
    amount_php integer,
    method text CHECK (method IS NULL OR method IN ('gcash', 'card')),
    premium_until timestamptz,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_events_created ON public.premium_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_premium_events_user ON public.premium_events(user_id);

ALTER TABLE public.premium_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.premium_config FROM anon, authenticated;
REVOKE ALL ON public.premium_events FROM anon, authenticated;
