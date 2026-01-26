-- Добавляем колонки для Telegram в таблицу profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS telegram_user_id bigint,
ADD COLUMN IF NOT EXISTS telegram_username text,
ADD COLUMN IF NOT EXISTS telegram_first_name text;

-- Создаём индекс для быстрого поиска по telegram_user_id
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_user_id ON public.profiles(telegram_user_id);