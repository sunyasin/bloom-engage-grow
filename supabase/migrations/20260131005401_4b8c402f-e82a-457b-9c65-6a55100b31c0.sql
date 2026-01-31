-- Add course_id to community_posts for filtering
ALTER TABLE public.community_posts 
ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

-- Index for efficient filtering
CREATE INDEX idx_community_posts_course_id ON public.community_posts(course_id);