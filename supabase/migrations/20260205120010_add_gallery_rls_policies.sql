-- RLS Policies for Gallery Tables
-- Execute this SQL in Supabase SQL Editor

-- Enable RLS on gallery tables
ALTER TABLE public.gallery_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_audio ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all gallery data
CREATE POLICY "Public can read collections"
  ON public.gallery_collections FOR SELECT
  USING (true);

CREATE POLICY "Public can read photos"
  ON public.gallery_photos FOR SELECT
  USING (true);

CREATE POLICY "Public can read posts"
  ON public.gallery_posts FOR SELECT
  USING (true);

CREATE POLICY "Public can read audio"
  ON public.gallery_audio FOR SELECT
  USING (true);

-- Allow authenticated users to insert/update (for owners only in app logic)
CREATE POLICY "Authenticated can insert collections"
  ON public.gallery_collections FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert photos"
  ON public.gallery_photos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert posts"
  ON public.gallery_posts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can insert audio"
  ON public.gallery_audio FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow owners to update their own data
CREATE POLICY "Owners can update collections"
  ON public.gallery_collections FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can update photos"
  ON public.gallery_photos FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can update posts"
  ON public.gallery_posts FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can update audio"
  ON public.gallery_audio FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.gallery_collections
      WHERE id = collection_id AND user_id::text = auth.uid()::text
    )
  );

-- Allow owners to delete their own data
CREATE POLICY "Owners can delete collections"
  ON public.gallery_collections FOR DELETE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can delete photos"
  ON public.gallery_photos FOR DELETE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can delete posts"
  ON public.gallery_posts FOR DELETE
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Owners can delete audio"
  ON public.gallery_audio FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.gallery_collections
      WHERE id = collection_id AND user_id::text = auth.uid()::text
    )
  );
