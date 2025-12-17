-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view published courses" ON public.courses;

-- Create new policy that allows community owners to see all courses in their community
CREATE POLICY "Anyone can view published courses or own community courses" 
ON public.courses 
FOR SELECT 
USING (
  (status = 'published'::course_status) 
  OR (author_id = auth.uid()) 
  OR has_role(auth.uid(), 'superuser'::app_role)
  OR (EXISTS (
    SELECT 1 FROM communities 
    WHERE communities.id = courses.community_id 
    AND communities.creator_id = auth.uid()
  ))
);