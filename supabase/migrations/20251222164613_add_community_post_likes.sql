/*
  # Add Community Post Likes System

  1. New Tables
    - `community_post_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references community_posts)
      - `user_id` (uuid)
      - `created_at` (timestamptz)

  2. Changes
    - Add unique constraint to prevent duplicate likes (one like per user per post)

  3. Security
    - Enable RLS on `community_post_likes` table
    - Add policy for anyone to view all likes
    - Add policy for authenticated users to create their own likes
    - Add policy for users to delete only their own likes

  4. Functions & Triggers
    - Create function to update user rating when like is added to post
    - Create function to decrease user rating when like is removed from post
    - Create triggers to call these functions automatically
*/

-- Create community_post_likes table
CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view post likes"
  ON public.community_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create post likes"
  ON public.community_post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own post likes"
  ON public.community_post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to increment author rating when like is added to post
CREATE OR REPLACE FUNCTION public.increment_author_rating_on_post_like()
RETURNS TRIGGER AS $$
DECLARE
  author_id UUID;
BEGIN
  -- Get the author of the post
  SELECT user_id INTO author_id
  FROM public.community_posts
  WHERE id = NEW.post_id;

  -- Increment the author's rating
  UPDATE public.profiles
  SET rating = COALESCE(rating, 0) + 1
  WHERE id = author_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement author rating when like is removed from post
CREATE OR REPLACE FUNCTION public.decrement_author_rating_on_post_unlike()
RETURNS TRIGGER AS $$
DECLARE
  author_id UUID;
BEGIN
  -- Get the author of the post
  SELECT user_id INTO author_id
  FROM public.community_posts
  WHERE id = OLD.post_id;

  -- Decrement the author's rating (but don't go below 0)
  UPDATE public.profiles
  SET rating = GREATEST(COALESCE(rating, 0) - 1, 0)
  WHERE id = author_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER trigger_increment_rating_on_post_like
  AFTER INSERT ON public.community_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_author_rating_on_post_like();

CREATE TRIGGER trigger_decrement_rating_on_post_unlike
  AFTER DELETE ON public.community_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_author_rating_on_post_unlike();

-- Enable realtime for post likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_likes;
