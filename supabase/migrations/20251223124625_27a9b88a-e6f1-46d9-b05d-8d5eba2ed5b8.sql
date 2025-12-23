-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Superuser can manage events" ON public.events;

-- Create policy for community owners to manage their events
CREATE POLICY "Community owners can manage events"
ON public.events
FOR ALL
USING (
  (creator_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = events.community_id
    AND communities.creator_id = auth.uid()
  )) OR
  has_role(auth.uid(), 'superuser'::app_role)
)
WITH CHECK (
  (creator_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM communities
    WHERE communities.id = events.community_id
    AND communities.creator_id = auth.uid()
  )) OR
  has_role(auth.uid(), 'superuser'::app_role)
);

-- Policy for authenticated users to create events in their communities
CREATE POLICY "Members can create events in their communities"
ON public.events
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id AND
  (
    community_id IS NULL OR
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = events.community_id
      AND community_members.user_id = auth.uid()
    )
  )
);