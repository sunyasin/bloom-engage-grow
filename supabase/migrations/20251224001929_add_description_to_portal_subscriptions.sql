/*
  # Add description field to portal_subscriptions

  ## Changes
    - Add `description` field to `portal_subscriptions` table
    - This field will store a description for each subscription tier

  ## Notes
    - Nullable field to allow existing records to remain valid
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'portal_subscriptions' AND column_name = 'description'
  ) THEN
    ALTER TABLE portal_subscriptions ADD COLUMN description text;
  END IF;
END $$;
