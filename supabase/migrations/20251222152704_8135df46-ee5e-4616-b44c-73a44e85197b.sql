-- Add required_rating (numeric threshold) to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS required_rating integer DEFAULT NULL;

-- Add gifted_emails (comma-separated emails) to courses  
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS gifted_emails text DEFAULT NULL;

-- Add promo_code to courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS promo_code text DEFAULT NULL;

-- Add access_types array for multi-select (replaces single access_type)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS access_types text[] DEFAULT '{}'::text[];