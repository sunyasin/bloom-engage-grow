-- Create community-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to community-images bucket
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'community-images');

-- Allow public read access to community images
CREATE POLICY "Public read access for community images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community-images');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own community images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own community images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'community-images' AND auth.uid()::text = (storage.foldername(name))[1]);