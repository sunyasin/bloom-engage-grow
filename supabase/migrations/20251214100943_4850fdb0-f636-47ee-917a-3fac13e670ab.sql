-- Drop existing insert policy for courses
DROP POLICY IF EXISTS "Authors can create courses" ON public.courses;

-- Create new policy that allows community creators to create courses
CREATE POLICY "Authors and community owners can create courses" 
ON public.courses 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id 
  AND (
    has_role(auth.uid(), 'author'::app_role) 
    OR has_role(auth.uid(), 'superuser'::app_role)
    OR EXISTS (
      SELECT 1 FROM communities 
      WHERE communities.id = community_id 
      AND communities.creator_id = auth.uid()
    )
  )
);