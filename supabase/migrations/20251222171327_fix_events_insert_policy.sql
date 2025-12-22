/*
  # Fix Events INSERT Policy

  1. Changes
    - Drop existing INSERT policy for events
    - Create new policy that allows:
      - Community owners and moderators (active members) to create events
      - Superusers to create any events

  2. Security
    - Ensures creator_id matches auth.uid()
    - Checks community membership and role for community events
    - Checks is_active status for community members
    - Allows superusers to create events in any community
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Community owners and moderators can create events" ON public.events;

-- Create new INSERT policy with superuser support and is_active check
CREATE POLICY "Community owners, moderators, and superusers can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    (
      -- Superusers can create any event
      public.has_role(auth.uid(), 'superuser') OR
      -- Community is null (global events) - currently not used
      community_id IS NULL OR
      -- User is an active owner or moderator of the community
      EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_members.community_id = events.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('owner', 'moderator')
        AND community_members.is_active = true
      )
    )
  );
