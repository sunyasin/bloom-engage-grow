-- Allow multiple submissions per user+lesson (keep history)
ALTER TABLE public.homework_submissions
DROP CONSTRAINT IF EXISTS homework_submissions_user_id_lesson_id_key;

-- Helpful index for fetching latest submission per user/lesson
CREATE INDEX IF NOT EXISTS idx_homework_submissions_user_lesson_created
ON public.homework_submissions (user_id, lesson_id, created_at DESC);