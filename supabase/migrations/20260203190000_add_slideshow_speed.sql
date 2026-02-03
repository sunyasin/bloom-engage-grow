-- Add slideshow_speed field to gallery_collections
ALTER TABLE public.gallery_collections
  ADD COLUMN slideshow_speed INTEGER NOT NULL DEFAULT 5 CHECK (slideshow_speed >= 1 AND slideshow_speed <= 100);

COMMENT ON COLUMN public.gallery_collections.slideshow_speed IS 'Скорость слайд-шоу в секундах (1-100)';
