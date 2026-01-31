-- Add course_id column to direct_messages table
ALTER TABLE public.direct_messages 
ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- Create index for course-scoped message lookups
CREATE INDEX idx_direct_messages_course_id ON public.direct_messages(course_id);

-- Add comment
COMMENT ON COLUMN public.direct_messages.course_id IS 'Optional link to a course for course-specific chats';