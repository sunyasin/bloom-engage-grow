-- Create enum type for community types
CREATE TYPE public.community_type AS ENUM ('shop', 'gallery', 'course');

-- Add type column to communities table with default 'course'
ALTER TABLE public.communities
ADD COLUMN type public.community_type NOT NULL DEFAULT 'course';

-- Update existing records to have type = 'course'
UPDATE public.communities
SET type = 'course'
WHERE type IS NULL;

-- Add comment to the column
COMMENT ON COLUMN public.communities.type IS 'Тип сообщества: shop, gallery, course';
