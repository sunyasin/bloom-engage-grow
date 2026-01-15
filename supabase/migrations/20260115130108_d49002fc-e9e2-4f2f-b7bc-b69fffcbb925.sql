-- Add streaming fields to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS zoom_link TEXT,
ADD COLUMN IF NOT EXISTS is_zoom_stream BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS youtube_stream_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_embed_url TEXT,
ADD COLUMN IF NOT EXISTS is_youtube_stream BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stream_status TEXT DEFAULT 'scheduled' CHECK (stream_status IN ('scheduled', 'live', 'ended')),
ADD COLUMN IF NOT EXISTS stream_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stream_end_time TIMESTAMPTZ;