-- Add column to track if homework blocks the next lesson
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS homework_blocks_next boolean DEFAULT false;