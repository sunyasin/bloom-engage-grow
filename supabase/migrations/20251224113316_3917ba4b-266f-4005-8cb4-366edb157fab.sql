-- Create portal_subscriptions table
CREATE TABLE IF NOT EXISTS public.portal_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  badge_text TEXT NOT NULL DEFAULT '',
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  payment_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for portal_subscriptions
CREATE POLICY "Anyone can view active portal subscriptions"
  ON public.portal_subscriptions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Superuser can manage portal subscriptions"
  ON public.portal_subscriptions
  FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role));

-- Add portal_subscription_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS portal_subscription_id UUID REFERENCES public.portal_subscriptions(id) ON DELETE SET NULL;

-- Add missing columns to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS subscription_tier_id UUID REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'yookassa',
ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_provider_payment_id ON public.transactions(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);