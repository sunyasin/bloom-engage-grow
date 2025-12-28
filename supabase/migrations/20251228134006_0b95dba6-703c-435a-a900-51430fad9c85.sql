-- Create table to track when users start a course (first lesson view)
CREATE TABLE public.course_starts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_starts ENABLE ROW LEVEL SECURITY;

-- Users can view their own course starts
CREATE POLICY "Users can view own course starts"
ON public.course_starts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own course start
CREATE POLICY "Users can insert own course start"
ON public.course_starts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_course_starts_user_course ON public.course_starts(user_id, course_id);