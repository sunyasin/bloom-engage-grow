-- Добавление playback_mode в gallery_collections
-- Выполните этот SQL в Supabase SQL Editor

-- Удалите старую колонку если есть (audio_url, audio_filename)
ALTER TABLE gallery_collections DROP COLUMN IF EXISTS audio_url;
ALTER TABLE gallery_collections DROP COLUMN IF EXISTS audio_filename;

-- Добавьте playback_mode
ALTER TABLE gallery_collections ADD COLUMN IF NOT EXISTS playback_mode TEXT DEFAULT 'repeat_all';

-- Удалите playback_mode из gallery_audio если есть
ALTER TABLE gallery_audio DROP COLUMN IF EXISTS playback_mode;
