-- Добавление колонки audio_filename в gallery_collections
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE gallery_collections ADD COLUMN IF NOT EXISTS audio_filename TEXT;
