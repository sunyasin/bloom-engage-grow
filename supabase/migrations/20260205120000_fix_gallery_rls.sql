-- Исправленные RLS политики для Supabase Storage
-- Выполните этот SQL в Supabase SQL Editor

-- Удаляем старые политики для gallery_public
drop policy if exists "Gallery: owner update" on storage.objects;
drop policy if exists "AGallery: authenticated upload" on storage.objects;
drop policy if exists "Gallery: public read" on storage.objects;

-- Создаём bucket если не существует
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'gallery-public') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('gallery_public', 'gallery-public', true);
  END IF;
END $$;

-- Включаем RLS на objects
--ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Политика для публичного чтения - любой может просматривать
CREATE POLICY "Gallery: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-public');

-- Политика для загрузки - авторизованные пользователи
-- using: true означает что проверка не требуется при SELECT
-- with check: auth.role() = 'authenticated' проверяет что пользователь авторизован при INSERT
CREATE POLICY "Gallery: authenticated upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery-public' 
    AND auth.role() = 'authenticated'
  );

-- Политика для обновления - только владелец файла
CREATE POLICY "Gallery: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'gallery-public'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
