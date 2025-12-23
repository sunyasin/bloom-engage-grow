-- Create community_post_likes table for post likes
CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create community_reply_likes table for reply likes
CREATE TABLE IF NOT EXISTS public.community_reply_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL REFERENCES public.community_post_replies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

-- Add parent_reply_id to community_post_replies for nested replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_post_replies' AND column_name = 'parent_reply_id'
  ) THEN
    ALTER TABLE public.community_post_replies ADD COLUMN parent_reply_id uuid REFERENCES public.community_post_replies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add missing columns to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'community_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.events ADD COLUMN creator_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'access'
  ) THEN
    ALTER TABLE public.events ADD COLUMN access text DEFAULT 'all';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'min_rating'
  ) THEN
    ALTER TABLE public.events ADD COLUMN min_rating integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'required_tier'
  ) THEN
    ALTER TABLE public.events ADD COLUMN required_tier text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'link'
  ) THEN
    ALTER TABLE public.events ADD COLUMN link text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'send_email'
  ) THEN
    ALTER TABLE public.events ADD COLUMN send_email boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'location'
  ) THEN
    ALTER TABLE public.events ADD COLUMN location text;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reply_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for community_post_likes
CREATE POLICY "Anyone can view post likes"
  ON public.community_post_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON public.community_post_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes"
  ON public.community_post_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for community_reply_likes
CREATE POLICY "Anyone can view reply likes"
  ON public.community_reply_likes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like replies"
  ON public.community_reply_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reply likes"
  ON public.community_reply_likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reply_likes;