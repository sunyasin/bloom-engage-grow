/*
  # Add Community Support to Events

  1. Changes to `events` table
    - Add `community_id` column (uuid, references communities)
    - Add `creator_id` column to track who created the event
    - Update RLS policies to allow community members to view events
    - Allow community owners/moderators to create and manage events

  2. Security
    - Update RLS policies:
      - Users can view events from communities they're members of
      - Community owners and moderators can create events
      - Event creators can update/delete their events
*/

-- Add community_id and creator_id to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'community_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN creator_id UUID;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

-- Create new RLS policies for events
CREATE POLICY "Users can view events from their communities"
  ON public.events FOR SELECT
  USING (
    community_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = events.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.is_active = true
    )
  );

CREATE POLICY "Community owners and moderators can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    (
      community_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.community_members
        WHERE community_members.community_id = events.community_id
        AND community_members.user_id = auth.uid()
        AND community_members.role IN ('owner', 'moderator')
      )
    )
  );

CREATE POLICY "Event creators can update their events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Event creators can delete their events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;