/*
  # Fix Community Members is_active Field

  1. Changes
    - Update all existing community_members records to set is_active = true where it's NULL
    - Ensure is_active has DEFAULT true constraint

  2. Purpose
    - Ensures all existing members have is_active set properly
    - Fixes any legacy data that might have NULL values
*/

-- Update all existing records where is_active is NULL
UPDATE public.community_members
SET is_active = true
WHERE is_active IS NULL;

-- Ensure the column has DEFAULT true and NOT NULL constraint
ALTER TABLE public.community_members
ALTER COLUMN is_active SET DEFAULT true;

-- Set NOT NULL constraint
ALTER TABLE public.community_members
ALTER COLUMN is_active SET NOT NULL;
