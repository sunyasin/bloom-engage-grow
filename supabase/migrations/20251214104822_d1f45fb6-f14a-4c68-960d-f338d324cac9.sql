-- Create storage bucket for course covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for anyone to view course covers
CREATE POLICY "Anyone can view course covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-covers');

-- Create policy for course authors to upload covers
CREATE POLICY "Authors can upload course covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-covers' AND auth.uid() IS NOT NULL);

-- Create policy for authors to update their covers
CREATE POLICY "Authors can update course covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-covers' AND auth.uid() IS NOT NULL);

-- Create policy for authors to delete their covers
CREATE POLICY "Authors can delete course covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-covers' AND auth.uid() IS NOT NULL);