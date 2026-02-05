-- Новая структура для аудио в галерее
-- Выполните этот SQL в Supabase SQL Editor

-- 1. Добавить audio_url в gallery_collections
ALTER TABLE gallery_collections ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 2. Удалить старые поля из gallery_collections (если есть)
ALTER TABLE gallery_collections DROP COLUMN IF EXISTS audio_filename;

-- 3. Переименовать title в audio_filename в gallery_audio
ALTER TABLE gallery_audio RENAME COLUMN title TO audio_filename;
