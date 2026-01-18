-- Add community_limit column to portal_subscriptions
ALTER TABLE public.portal_subscriptions 
ADD COLUMN IF NOT EXISTS community_limit integer DEFAULT NULL;

-- Update existing plans with limits (NULL = unlimited)
UPDATE public.portal_subscriptions SET community_limit = 1 WHERE name ILIKE '%бесплатн%' OR name ILIKE '%free%';
UPDATE public.portal_subscriptions SET community_limit = 3 WHERE name ILIKE '%стандарт%' OR name ILIKE '%standard%';
UPDATE public.portal_subscriptions SET community_limit = NULL WHERE name ILIKE '%премиум%' OR name ILIKE '%premium%';

COMMENT ON COLUMN public.portal_subscriptions.community_limit IS 'Maximum number of communities allowed for this plan. NULL means unlimited.';