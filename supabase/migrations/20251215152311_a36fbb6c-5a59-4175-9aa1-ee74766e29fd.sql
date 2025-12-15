-- Create enum for membership status
CREATE TYPE public.membership_status AS ENUM ('active', 'canceled', 'expired', 'trial');

-- Create enum for renewal period
CREATE TYPE public.renewal_period AS ENUM ('monthly', 'yearly', 'lifetime');

-- Create subscription_tiers table
CREATE TABLE public.subscription_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) DEFAULT 0,
  price_yearly DECIMAL(10, 2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'RUB',
  is_free BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (community_id, slug)
);

-- Create memberships table
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  subscription_tier_id UUID REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
  status membership_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  renewal_period renewal_period NOT NULL DEFAULT 'monthly',
  external_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, community_id)
);

-- Enable RLS
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_tiers
CREATE POLICY "Anyone can view active subscription tiers"
ON public.subscription_tiers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Community owners can manage subscription tiers"
ON public.subscription_tiers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.communities
    WHERE communities.id = subscription_tiers.community_id
    AND (communities.creator_id = auth.uid() OR has_role(auth.uid(), 'superuser'::app_role))
  )
);

-- RLS policies for memberships
CREATE POLICY "Users can view own memberships"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'superuser'::app_role));

CREATE POLICY "Users can create own memberships"
ON public.memberships
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memberships"
ON public.memberships
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Community owners can view memberships"
ON public.memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.communities
    WHERE communities.id = memberships.community_id
    AND communities.creator_id = auth.uid()
  )
);

CREATE POLICY "Superusers can manage all memberships"
ON public.memberships
FOR ALL
USING (has_role(auth.uid(), 'superuser'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_subscription_tiers_updated_at
BEFORE UPDATE ON public.subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();