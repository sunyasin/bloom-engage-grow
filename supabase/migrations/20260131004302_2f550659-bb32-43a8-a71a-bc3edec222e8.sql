-- Add parent_message_id for threading replies
ALTER TABLE public.direct_messages 
ADD COLUMN parent_message_id uuid REFERENCES public.direct_messages(id) ON DELETE CASCADE;

-- Add is_pinned for pinning messages
ALTER TABLE public.direct_messages 
ADD COLUMN is_pinned boolean DEFAULT false;

-- Create index for parent message lookups
CREATE INDEX idx_direct_messages_parent ON public.direct_messages(parent_message_id);

-- Add comments
COMMENT ON COLUMN public.direct_messages.parent_message_id IS 'Reference to parent message for threaded replies';
COMMENT ON COLUMN public.direct_messages.is_pinned IS 'Whether the message is pinned (for course chats)';