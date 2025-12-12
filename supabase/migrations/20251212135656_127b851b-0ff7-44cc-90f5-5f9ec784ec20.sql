
-- Add missing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_login_ip text,
ADD COLUMN IF NOT EXISTS telegram_id text;

-- Add missing fields to communities table  
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS slug text UNIQUE,
ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Update community_members with missing fields
ALTER TABLE public.community_members
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create rating_level enum
CREATE TYPE public.rating_level AS ENUM ('newbie', 'regular', 'experienced', 'guru');

-- Create course_status enum
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');

-- Create access_type enum
CREATE TYPE public.access_type AS ENUM ('open', 'delayed', 'paid_subscription', 'gifted', 'promo_code', 'by_rating_level', 'delayed_by_rating');

-- Create subscription_type enum
CREATE TYPE public.subscription_type AS ENUM ('one_time', 'periodic');

-- Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'canceled', 'pending');

-- Create payment_status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Create discount_type enum
CREATE TYPE public.discount_type AS ENUM ('percent', 'fixed');

-- Create lesson_type enum
CREATE TYPE public.lesson_type AS ENUM ('lesson', 'test', 'assignment');

-- Create block_type enum
CREATE TYPE public.block_type AS ENUM ('text', 'image', 'checkbox', 'input_text', 'button', 'link', 'list', 'video');

-- Create progress_status enum
CREATE TYPE public.progress_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Create community_role enum
CREATE TYPE public.community_role AS ENUM ('owner', 'moderator', 'member');

-- Courses table
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  author_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image_url text,
  status course_status DEFAULT 'draft',
  access_type access_type DEFAULT 'open',
  delay_days integer,
  required_rating_level rating_level,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(community_id, slug)
);

-- Course access rules table
CREATE TABLE public.course_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  rule_type text NOT NULL,
  value jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  type subscription_type NOT NULL,
  period_months integer,
  started_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  status subscription_status DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'RUB',
  payment_method text,
  status payment_status DEFAULT 'pending',
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type discount_type NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  max_uses integer,
  used_count integer DEFAULT 0,
  valid_from timestamp with time zone,
  valid_to timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Lessons table
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  parent_lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title text NOT NULL,
  order_index integer DEFAULT 0,
  type lesson_type DEFAULT 'lesson',
  content_html text,
  video_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Lesson blocks table
CREATE TABLE public.lesson_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  block_type block_type NOT NULL,
  order_index integer DEFAULT 0,
  config_json jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Lesson progress table
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  status progress_status DEFAULT 'not_started',
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Tests table
CREATE TABLE public.tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  config_json jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Emoji table
CREATE TABLE public.emoji (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  emoji_char text,
  created_at timestamp with time zone DEFAULT now()
);

-- Add parent_message_id to community_posts for threading
ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS parent_message_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL;

-- Direct messages table
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content_text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

-- Ratings table (per user per community)
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  level rating_level DEFAULT 'newbie',
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, community_id)
);

-- Help sections table
CREATE TABLE public.help_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.help_sections(id) ON DELETE SET NULL,
  title text NOT NULL,
  content_html text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Backups metadata table
CREATE TABLE public.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  file_size bigint,
  backup_type text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emoji ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Anyone can view published courses" ON public.courses FOR SELECT USING (status = 'published' OR author_id = auth.uid() OR has_role(auth.uid(), 'superuser'));
CREATE POLICY "Authors can create courses" ON public.courses FOR INSERT WITH CHECK (auth.uid() = author_id AND (has_role(auth.uid(), 'author') OR has_role(auth.uid(), 'superuser')));
CREATE POLICY "Authors can update own courses" ON public.courses FOR UPDATE USING (auth.uid() = author_id OR has_role(auth.uid(), 'superuser'));
CREATE POLICY "Authors can delete own courses" ON public.courses FOR DELETE USING (auth.uid() = author_id OR has_role(auth.uid(), 'superuser'));

-- RLS Policies for lessons
CREATE POLICY "Anyone can view lessons of published courses" ON public.lessons FOR SELECT USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND (courses.status = 'published' OR courses.author_id = auth.uid())));
CREATE POLICY "Course authors can manage lessons" ON public.lessons FOR ALL USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND (courses.author_id = auth.uid() OR has_role(auth.uid(), 'superuser'))));

-- RLS Policies for lesson_blocks
CREATE POLICY "Anyone can view lesson blocks" ON public.lesson_blocks FOR SELECT USING (true);
CREATE POLICY "Course authors can manage blocks" ON public.lesson_blocks FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id = l.course_id WHERE l.id = lesson_blocks.lesson_id AND (c.author_id = auth.uid() OR has_role(auth.uid(), 'superuser'))));

-- RLS Policies for lesson_progress
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can modify own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'superuser'));
CREATE POLICY "System can manage subscriptions" ON public.subscriptions FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'superuser'));
CREATE POLICY "Superuser can manage transactions" ON public.transactions FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for promo_codes
CREATE POLICY "Anyone can view valid promo codes" ON public.promo_codes FOR SELECT USING (true);
CREATE POLICY "Superuser can manage promo codes" ON public.promo_codes FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for tests
CREATE POLICY "Anyone can view tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Course authors can manage tests" ON public.tests FOR ALL USING (EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON c.id = l.course_id WHERE l.id = tests.lesson_id AND (c.author_id = auth.uid() OR has_role(auth.uid(), 'superuser'))));

-- RLS Policies for emoji
CREATE POLICY "Anyone can view emoji" ON public.emoji FOR SELECT USING (true);
CREATE POLICY "Superuser can manage emoji" ON public.emoji FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for direct_messages
CREATE POLICY "Users can view own messages" ON public.direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can delete own sent messages" ON public.direct_messages FOR DELETE USING (auth.uid() = sender_id);

-- RLS Policies for ratings
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "System can manage ratings" ON public.ratings FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for help_sections
CREATE POLICY "Anyone can view help sections" ON public.help_sections FOR SELECT USING (true);
CREATE POLICY "Superuser can manage help sections" ON public.help_sections FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for audit_logs
CREATE POLICY "Superuser can view audit logs" ON public.audit_logs FOR SELECT USING (has_role(auth.uid(), 'superuser'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for backups
CREATE POLICY "Superuser can manage backups" ON public.backups FOR ALL USING (has_role(auth.uid(), 'superuser'));

-- RLS Policies for course_access_rules
CREATE POLICY "Anyone can view access rules" ON public.course_access_rules FOR SELECT USING (true);
CREATE POLICY "Course authors can manage access rules" ON public.course_access_rules FOR ALL USING (EXISTS (SELECT 1 FROM public.courses WHERE courses.id = course_access_rules.course_id AND (courses.author_id = auth.uid() OR has_role(auth.uid(), 'superuser'))));

-- Insert default emoji
INSERT INTO public.emoji (name, emoji_char) VALUES
('heart', '❤️'),
('thumbs_up', '👍'),
('clap', '👏'),
('fire', '🔥'),
('star', '⭐'),
('rocket', '🚀'),
('thinking', '🤔'),
('laugh', '😂'),
('sad', '😢'),
('angry', '😠'),
('surprised', '😮'),
('love', '😍'),
('cool', '😎'),
('party', '🎉'),
('muscle', '💪'),
('check', '✅'),
('question', '❓'),
('bulb', '💡'),
('trophy', '🏆'),
('excellent', '🌟');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_progress;
