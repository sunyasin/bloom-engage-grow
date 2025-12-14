-- Create storage bucket for lesson videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-videos', 
  'lesson-videos', 
  false,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'application/x-mpegURL', 'video/MP2T']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for lesson videos bucket
CREATE POLICY "Authenticated users can view lesson videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Course authors can upload lesson videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-videos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Course authors can update lesson videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Course authors can delete lesson videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-videos' AND auth.role() = 'authenticated');