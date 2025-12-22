/*
  # Cleanup Events RLS Policies

  1. Changes
    - Drop old conflicting "Superuser can manage events" policy
    - Add separate UPDATE and DELETE policies for superusers
    - Keep existing INSERT policy

  2. Security
    - Maintains proper separation of concerns
    - Ensures superusers have full access
    - Ensures community owners/moderators can manage events
    - Ensures event creators can manage their own events
*/

-- Drop the old conflicting policy
DROP POLICY IF EXISTS "Superuser can manage events" ON public.events;

-- Add superuser policies for UPDATE
CREATE POLICY "Superusers can update any event"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superuser'))
  WITH CHECK (public.has_role(auth.uid(), 'superuser'));

-- Add superuser policy for DELETE
CREATE POLICY "Superusers can delete any event"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'superuser'));
