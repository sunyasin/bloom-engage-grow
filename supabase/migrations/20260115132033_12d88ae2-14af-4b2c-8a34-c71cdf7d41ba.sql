-- Add additional fields for YouTube stream data
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS youtube_broadcast_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_rtmp_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT,
ADD COLUMN IF NOT EXISTS youtube_watch_url TEXT;