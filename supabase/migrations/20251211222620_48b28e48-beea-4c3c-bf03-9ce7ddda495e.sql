-- Create communities table
CREATE TABLE public.communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  creator_id UUID NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_members table
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create community_posts table (separate feed per community)
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_post_replies table
CREATE TABLE public.community_post_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_replies ENABLE ROW LEVEL SECURITY;

-- Communities policies
CREATE POLICY "Anyone can view public communities"
ON public.communities FOR SELECT
USING (visibility = 'public' OR EXISTS (
  SELECT 1 FROM public.community_members 
  WHERE community_id = id AND user_id = auth.uid()
) OR has_role(auth.uid(), 'superuser'));

CREATE POLICY "Authors and superusers can create communities"
ON public.communities FOR INSERT
WITH CHECK (auth.uid() = creator_id AND (
  has_role(auth.uid(), 'author') OR has_role(auth.uid(), 'superuser')
));

CREATE POLICY "Community owners and superusers can update communities"
ON public.communities FOR UPDATE
USING (creator_id = auth.uid() OR has_role(auth.uid(), 'superuser'));

CREATE POLICY "Community owners and superusers can delete communities"
ON public.communities FOR DELETE
USING (creator_id = auth.uid() OR has_role(auth.uid(), 'superuser'));

-- Community members policies
CREATE POLICY "Anyone can view community members"
ON public.community_members FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join public communities"
ON public.community_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
ON public.community_members FOR DELETE
USING (auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND creator_id = auth.uid()) OR
  has_role(auth.uid(), 'superuser'));

-- Community posts policies
CREATE POLICY "Anyone can view community posts"
ON public.community_posts FOR SELECT
USING (true);

CREATE POLICY "Members can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.community_members 
  WHERE community_id = community_posts.community_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update own posts"
ON public.community_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON public.community_posts FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'superuser'));

-- Community post replies policies
CREATE POLICY "Anyone can view replies"
ON public.community_post_replies FOR SELECT
USING (true);

CREATE POLICY "Members can create replies"
ON public.community_post_replies FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.community_posts cp
  JOIN public.community_members cm ON cm.community_id = cp.community_id
  WHERE cp.id = post_id AND cm.user_id = auth.uid()
));

CREATE POLICY "Users can update own replies"
ON public.community_post_replies FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
ON public.community_post_replies FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'superuser'));

-- Function to update member count
CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities 
    SET member_count = member_count + 1 
    WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities 
    SET member_count = member_count - 1 
    WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for member count
CREATE TRIGGER on_community_member_change
  AFTER INSERT OR DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();

-- Trigger for updated_at
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_post_replies_updated_at
  BEFORE UPDATE ON public.community_post_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for community posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_replies;