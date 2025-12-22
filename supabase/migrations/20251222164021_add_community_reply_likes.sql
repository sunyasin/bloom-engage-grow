/*
  # Add Community Reply Likes System

  1. New Tables
    - `community_reply_likes`
      - `id` (uuid, primary key)
      - `reply_id` (uuid, references community_post_replies)
      - `user_id` (uuid)
      - `created_at` (timestamptz)

  2. Changes
    - Add unique constraint to prevent duplicate likes (one like per user per reply)

  3. Security
    - Enable RLS on `community_reply_likes` table
    - Add policy for authenticated users to view all likes
    - Add policy for authenticated users to create their own likes
    - Add policy for users to delete only their own likes

  4. Functions & Triggers
    - Create function to update user rating when like is added
    - Create function to decrease user rating when like is removed
    - Create triggers to call these functions automatically
*/

-- Create community_reply_likes table
CREATE TABLE IF NOT EXISTS public.community_reply_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID NOT NULL REFERENCES public.community_post_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_reply_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view likes"
  ON public.community_reply_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON public.community_reply_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.community_reply_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to increment author rating when like is added
CREATE OR REPLACE FUNCTION public.increment_author_rating_on_like()
RETURNS TRIGGER AS $$
DECLARE
  author_id UUID;
BEGIN
  -- Get the author of the reply
  SELECT user_id INTO author_id
  FROM public.community_post_replies
  WHERE id = NEW.reply_id;

  -- Increment the author's rating
  UPDATE public.profiles
  SET rating = COALESCE(rating, 0) + 1
  WHERE id = author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement author rating when like is removed
CREATE OR REPLACE FUNCTION public.decrement_author_rating_on_unlike()
RETURNS TRIGGER AS $$
DECLARE
  author_id UUID;
BEGIN
  -- Get the author of the reply
  SELECT user_id INTO author_id
  FROM public.community_post_replies
  WHERE id = OLD.reply_id;

  -- Decrement the author's rating (but don't go below 0)
  UPDATE public.profiles
  SET rating = GREATEST(COALESCE(rating, 0) - 1, 0)
  WHERE id = author_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER trigger_increment_rating_on_like
  AFTER INSERT ON public.community_reply_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_author_rating_on_like();

CREATE TRIGGER trigger_decrement_rating_on_unlike
  AFTER DELETE ON public.community_reply_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_author_rating_on_unlike();

-- Enable realtime for likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reply_likes;
