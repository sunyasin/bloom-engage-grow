-- Drop the old restrictive INSERT policy
DROP POLICY IF EXISTS "Members can create replies" ON public.community_post_replies;

-- Create a new INSERT policy that allows:
-- 1. Community members
-- 2. Community owners (creators)
-- 3. Superusers
CREATE POLICY "Members and owners can create replies" 
ON public.community_post_replies 
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) AND (
    -- User is a community member
    EXISTS (
      SELECT 1
      FROM community_posts cp
      JOIN community_members cm ON cm.community_id = cp.community_id
      WHERE cp.id = community_post_replies.post_id 
        AND cm.user_id = auth.uid()
    )
    OR
    -- User is the community owner
    EXISTS (
      SELECT 1
      FROM community_posts cp
      JOIN communities c ON c.id = cp.community_id
      WHERE cp.id = community_post_replies.post_id 
        AND c.creator_id = auth.uid()
    )
    OR
    -- User is a superuser
    has_role(auth.uid(), 'superuser'::app_role)
  )
);