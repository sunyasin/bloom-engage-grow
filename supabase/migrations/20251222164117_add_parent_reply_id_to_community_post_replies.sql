/*
  # Add Nested Replies Support

  1. Changes
    - Add `parent_reply_id` column to `community_post_replies` table to support nested replies
    - Add foreign key constraint to ensure parent_reply_id references valid reply

  2. Notes
    - This allows users to reply to specific replies, creating a conversation thread
    - NULL parent_reply_id means it's a direct reply to the post
*/

-- Add parent_reply_id column to support nested replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_post_replies' AND column_name = 'parent_reply_id'
  ) THEN
    ALTER TABLE public.community_post_replies
    ADD COLUMN parent_reply_id UUID REFERENCES public.community_post_replies(id) ON DELETE CASCADE;
  END IF;
END $$;
