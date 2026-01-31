-- Add community_id to direct_messages for community-scoped private chats
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id);

-- Add image_url for image attachments in messages
ALTER TABLE public.direct_messages 
ADD COLUMN IF NOT EXISTS image_url text;

-- Create index for faster community-scoped queries
CREATE INDEX IF NOT EXISTS idx_direct_messages_community_id ON public.direct_messages(community_id);

-- Create index for finding conversations between users in a community
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages(community_id, sender_id, recipient_id);

-- Update RLS policy to allow viewing messages within a community
DROP POLICY IF EXISTS "Users can view own messages" ON public.direct_messages;
CREATE POLICY "Users can view own messages" ON public.direct_messages
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Update insert policy
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
CREATE POLICY "Users can send messages" ON public.direct_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);