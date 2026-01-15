-- Add has_homework flag to lessons table
ALTER TABLE public.lessons ADD COLUMN has_homework boolean DEFAULT false;

-- Create enum for homework status
CREATE TYPE homework_status AS ENUM ('ready', 'ok', 'reject');

-- Create homework_submissions table
CREATE TABLE public.homework_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content text NOT NULL,
  status homework_status NOT NULL DEFAULT 'ready',
  moderator_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own submissions
CREATE POLICY "Users can view own homework submissions"
ON public.homework_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can submit homework"
ON public.homework_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own submissions (before moderation)
CREATE POLICY "Users can update own homework"
ON public.homework_submissions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'ready');

-- Course authors can view and moderate submissions
CREATE POLICY "Authors can view homework submissions"
ON public.homework_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE l.id = homework_submissions.lesson_id
    AND (c.author_id = auth.uid() OR has_role(auth.uid(), 'superuser'::app_role))
  )
);

-- Course authors can update submissions (for moderation)
CREATE POLICY "Authors can moderate homework"
ON public.homework_submissions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN courses c ON c.id = l.course_id
    WHERE l.id = homework_submissions.lesson_id
    AND (c.author_id = auth.uid() OR has_role(auth.uid(), 'superuser'::app_role))
  )
);