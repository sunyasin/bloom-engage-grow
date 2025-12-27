-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Anyone can view public communities" ON public.communities;

-- Create a new PERMISSIVE SELECT policy that allows:
-- 1. Anyone to view public communities
-- 2. Creators to always see their own communities
-- 3. Members to see communities they belong to
-- 4. Superusers to see all communities
CREATE POLICY "Users can view communities" 
ON public.communities 
FOR SELECT 
TO authenticated
USING (
  (visibility = 'public') OR 
  (creator_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_members.community_id = communities.id 
    AND community_members.user_id = auth.uid()
  )) OR 
  has_role(auth.uid(), 'superuser'::app_role)
);

-- Also allow anonymous users to see public communities
CREATE POLICY "Anonymous can view public communities" 
ON public.communities 
FOR SELECT 
TO anon
USING (visibility = 'public');