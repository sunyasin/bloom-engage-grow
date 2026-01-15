-- Add content_html column to communities table for storing rich text content
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS content_html TEXT;