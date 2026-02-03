-- Create enum for gallery playback mode
CREATE TYPE public.gallery_playback_mode AS ENUM ('repeat_one', 'repeat_all', 'mix');

-- Create gallery_audio table (Аудио-треки для коллекции)
CREATE TABLE public.gallery_audio (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  playback_mode public.gallery_playback_mode NOT NULL DEFAULT 'repeat_all',
  collection_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_audio
  ADD CONSTRAINT fk_collection_audio FOREIGN KEY (collection_id)
  REFERENCES public.gallery_collections(id) ON DELETE CASCADE;

CREATE INDEX idx_audio_collection_id ON public.gallery_audio(collection_id);

COMMENT ON TABLE public.gallery_audio IS 'Аудио-треки для галереи';
COMMENT ON COLUMN public.gallery_audio.url IS 'URL аудио-файла из storage';
COMMENT ON COLUMN public.gallery_audio.playback_mode IS 'Режим воспроизведения: repeat_one, repeat_all, mix';

-- Create enum for order status
CREATE TYPE public.order_status AS ENUM ('new', 'paid', 'delivery', 'delivered', 'archived');

-- Create orders table (Заказы)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ссылка на фото или пост
  photo_id BIGINT,
  post_id BIGINT,
  
  -- Товар
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  quantity INTEGER NOT NULL DEFAULT 1,
  options TEXT, -- JSON строка с опциями товара
  
  -- Статус
  status public.order_status NOT NULL DEFAULT 'new',
  status_changed_at TIMESTAMPTZ,
  
  -- Контактные данные
  address TEXT,
  phone TEXT,
  email TEXT,
  comment TEXT
);

ALTER TABLE public.orders
  ADD CONSTRAINT fk_order_photo FOREIGN KEY (photo_id)
  REFERENCES public.gallery_photos(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT fk_order_post FOREIGN KEY (post_id)
  REFERENCES public.gallery_posts(id) ON DELETE SET NULL;

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);

COMMENT ON TABLE public.orders IS 'Заказы';
COMMENT ON COLUMN public.orders.photo_id IS 'Ссылка на фото из галереи';
COMMENT ON COLUMN public.orders.post_id IS 'Ссылка на пост из галереи';
COMMENT ON COLUMN public.orders.options IS 'JSON строка с опциями товара (размер, цвет и т.д.)';
COMMENT ON COLUMN public.orders.status_changed_at IS 'Дата последнего изменения статуса заказа';
