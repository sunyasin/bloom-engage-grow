-- Добавление колонки audio_url в gallery_collections
-- Выполните этот SQL в Supabase SQL Editor

ALTER TABLE gallery_collections ADD COLUMN IF NOT EXISTS audio_url TEXT;
