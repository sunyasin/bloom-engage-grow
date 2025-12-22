/*
  # Add access control and additional fields to events table

  1. Changes
    - Add `access` column with values: 'all', 'for_rating', 'for_tier' (default: 'all')
    - Add `min_rating` column for rating-based access control (nullable integer)
    - Add `required_tier` column for tier-based access control (nullable text)
    - Add `link` column for event link (nullable text)
    - Add `description` column for event description (nullable text)
    - Add `send_email` column for email notification flag (boolean, default: false)
  
  2. Security
    - No RLS changes needed, existing policies cover new columns
*/

DO $$
BEGIN
  -- Add access column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'access'
  ) THEN
    ALTER TABLE events ADD COLUMN access text DEFAULT 'all' CHECK (access IN ('all', 'for_rating', 'for_tier'));
  END IF;

  -- Add min_rating column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'min_rating'
  ) THEN
    ALTER TABLE events ADD COLUMN min_rating integer;
  END IF;

  -- Add required_tier column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'required_tier'
  ) THEN
    ALTER TABLE events ADD COLUMN required_tier text CHECK (required_tier IN ('pro', 'vip'));
  END IF;

  -- Add link column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'link'
  ) THEN
    ALTER TABLE events ADD COLUMN link text;
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'description'
  ) THEN
    ALTER TABLE events ADD COLUMN description text;
  END IF;

  -- Add send_email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'send_email'
  ) THEN
    ALTER TABLE events ADD COLUMN send_email boolean DEFAULT false;
  END IF;
END $$;