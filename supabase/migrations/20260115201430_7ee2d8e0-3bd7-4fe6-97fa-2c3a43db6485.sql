-- Create storage bucket for community content (images, videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('community-content', 'community-content', true, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to community-content bucket
CREATE POLICY "Allow authenticated uploads to community-content"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community-content');

-- Allow public read access to community-content bucket
CREATE POLICY "Allow public read access to community-content"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'community-content');

-- Allow users to delete their own uploads
CREATE POLICY "Allow delete own files in community-content"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'community-content');