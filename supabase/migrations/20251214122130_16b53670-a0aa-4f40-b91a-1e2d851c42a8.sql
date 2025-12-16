-- Create storage bucket for lesson images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-images', 
  'lesson-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for lesson images bucket
CREATE POLICY "Anyone can view lesson images"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-images');

CREATE POLICY "Authenticated users can upload lesson images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update lesson images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete lesson images"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-images' AND auth.role() = 'authenticated');