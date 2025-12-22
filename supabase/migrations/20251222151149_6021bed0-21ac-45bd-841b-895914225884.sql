-- Add payment_url column to subscription_tiers table
ALTER TABLE public.subscription_tiers
ADD COLUMN payment_url text DEFAULT NULL;