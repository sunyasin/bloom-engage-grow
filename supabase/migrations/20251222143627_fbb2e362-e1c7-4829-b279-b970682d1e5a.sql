-- Add selected_course_ids column to subscription_tiers
ALTER TABLE public.subscription_tiers 
ADD COLUMN IF NOT EXISTS selected_course_ids uuid[] DEFAULT '{}';

-- Add comment for clarity
COMMENT ON COLUMN public.subscription_tiers.selected_course_ids IS 'Array of course IDs that this subscription tier grants access to when courses_selected feature is enabled';