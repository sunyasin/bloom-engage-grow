-- Add delay_days field to lessons table for delayed opening
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS delay_days integer DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.lessons.delay_days IS 'Number of days after course start (first lesson view) to open this lesson';