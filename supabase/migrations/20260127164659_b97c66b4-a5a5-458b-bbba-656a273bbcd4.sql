-- Add tier_id column with auto-increment to subscription_tiers
ALTER TABLE public.subscription_tiers 
ADD COLUMN tier_id SERIAL;

-- Create index for faster lookups
CREATE INDEX idx_subscription_tiers_tier_id ON public.subscription_tiers(tier_id);