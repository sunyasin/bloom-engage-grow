-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('user', 'superuser');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  real_name TEXT,
  state TEXT,
  city TEXT,
  about_me TEXT,
  avatar_url TEXT,
  rating INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  payplan INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create posts table for conversation system
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_replies table
CREATE TABLE public.post_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create post_reactions table for emoji reactions
CREATE TABLE public.post_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.post_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT post_or_reply_check CHECK (
    (post_id IS NOT NULL AND reply_id IS NULL) OR 
    (post_id IS NULL AND reply_id IS NOT NULL)
  ),
  UNIQUE(post_id, user_id, emoji),
  UNIQUE(reply_id, user_id, emoji)
);

-- Create classroom_blocks table
CREATE TABLE public.classroom_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_number INTEGER NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  page_id UUID,
  required_rating INTEGER DEFAULT 0,
  required_payplan INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classroom_pages table
CREATE TABLE public.classroom_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_name TEXT NOT NULL UNIQUE,
  html_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (TRUE);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Anyone can view roles" 
  ON public.user_roles FOR SELECT 
  USING (TRUE);

CREATE POLICY "Only superuser can manage roles" 
  ON public.user_roles FOR ALL 
  USING (public.has_role(auth.uid(), 'superuser'));

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts" 
  ON public.posts FOR SELECT 
  USING (TRUE);

CREATE POLICY "Authenticated users can create posts" 
  ON public.posts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" 
  ON public.posts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Superuser can pin posts" 
  ON public.posts FOR UPDATE 
  USING (public.has_role(auth.uid(), 'superuser'));

CREATE POLICY "Users can delete own posts" 
  ON public.posts FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for post_replies
CREATE POLICY "Anyone can view replies" 
  ON public.post_replies FOR SELECT 
  USING (TRUE);

CREATE POLICY "Authenticated users can create replies" 
  ON public.post_replies FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies" 
  ON public.post_replies FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies" 
  ON public.post_replies FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for post_reactions
CREATE POLICY "Anyone can view reactions" 
  ON public.post_reactions FOR SELECT 
  USING (TRUE);

CREATE POLICY "Authenticated users can add reactions" 
  ON public.post_reactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" 
  ON public.post_reactions FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for classroom_blocks
CREATE POLICY "Anyone can view classroom blocks" 
  ON public.classroom_blocks FOR SELECT 
  USING (TRUE);

CREATE POLICY "Superuser can manage classroom blocks" 
  ON public.classroom_blocks FOR ALL 
  USING (public.has_role(auth.uid(), 'superuser'));

-- RLS Policies for classroom_pages
CREATE POLICY "Anyone can view classroom pages" 
  ON public.classroom_pages FOR SELECT 
  USING (TRUE);

CREATE POLICY "Superuser can manage classroom pages" 
  ON public.classroom_pages FOR ALL 
  USING (public.has_role(auth.uid(), 'superuser'));

-- RLS Policies for events
CREATE POLICY "Anyone can view events" 
  ON public.events FOR SELECT 
  USING (TRUE);

CREATE POLICY "Superuser can manage events" 
  ON public.events FOR ALL 
  USING (public.has_role(auth.uid(), 'superuser'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_replies_updated_at BEFORE UPDATE ON public.post_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON public.classroom_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.classroom_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial classroom blocks (6 blocks)
INSERT INTO public.classroom_blocks (block_number, title, description, required_rating, required_payplan) VALUES
  (1, 'Block 1', 'Getting Started', 0, 0),
  (2, 'Block 2', 'Intermediate Level', 10, 0),
  (3, 'Block 3', 'Advanced Training', 0, 1),
  (4, 'Block 4', 'Professional Course', 0, 2),
  (5, 'Block 5', 'Expert Level', 0, 1),
  (6, 'Block 6', 'Master Class', 0, 1);

-- Insert corresponding classroom pages
INSERT INTO public.classroom_pages (page_name, html_content) VALUES
  ('class1', '<h1>Class 1: Getting Started</h1><p>Welcome to your first class!</p>'),
  ('class2', '<h1>Class 2: Intermediate Level</h1><p>Build on your foundation.</p>'),
  ('class3', '<h1>Class 3: Advanced Training</h1><p>Take your skills further.</p>'),
  ('class4', '<h1>Class 4: Professional Course</h1><p>Master professional techniques.</p>'),
  ('class5', '<h1>Class 5: Expert Level</h1><p>Achieve expert status.</p>'),
  ('class6', '<h1>Class 6: Master Class</h1><p>Become a master.</p>');

-- Link blocks to pages
UPDATE public.classroom_blocks SET page_id = (SELECT id FROM public.classroom_pages WHERE page_name = 'class1') WHERE block_number = 1;
UPDATE public.classroom_blocks SET page_id = (SELECT id FROM public.classroom_pages WHERE page_name = 'class2') WHERE block_number = 2;
UPDATE public.classroom_blocks SET page_id = (SELECT id FROM public.classroom_pages WHERE page_name = 'class3') WHERE block_number = 3;
UPDATE public.classroom_blocks SET page_id = (SELECT id FROM public.classroom_pages WHERE page_name = 'class4') WHERE block_number = 4;
UPDATE public.classroom_blocks SET page_id = (SELECT id FROM public.classroom_pages WHERE page_name = 'class5') WHERE block_number = 5;
UPDATE public.classroom_blocks SET page_id = (SELECT id FROM public.classroom_pages WHERE page_name = 'class6') WHERE block_number = 6;