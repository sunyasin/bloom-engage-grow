-- Create gallery_collections table (Сборники) with thumbnail
CREATE TABLE public.gallery_collections (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  thumbnail_url TEXT,
  community_id UUID,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_collections
  ADD CONSTRAINT fk_community FOREIGN KEY (community_id)
  REFERENCES public.communities(id) ON DELETE SET NULL;

CREATE INDEX idx_collections_user_id ON public.gallery_collections(user_id);
CREATE INDEX idx_collections_community_id ON public.gallery_collections(community_id);

-- Create gallery_posts table (Посты с HTML) with title and thumbnail
CREATE TABLE public.gallery_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  thumbnail_url TEXT,
  content_html TEXT NOT NULL,
  price DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'RUB',
  collection_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_posts
  ADD CONSTRAINT fk_collection_post FOREIGN KEY (collection_id)
  REFERENCES public.gallery_collections(id) ON DELETE CASCADE;

CREATE INDEX idx_posts_collection_id ON public.gallery_posts(collection_id);
CREATE INDEX idx_posts_user_id ON public.gallery_posts(user_id);

-- Create gallery_photos table (Фото)
CREATE TABLE public.gallery_photos (
  id BIGSERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'RUB',
  collection_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_photos
  ADD CONSTRAINT fk_collection_photo FOREIGN KEY (collection_id)
  REFERENCES public.gallery_collections(id) ON DELETE CASCADE;

CREATE INDEX idx_photos_collection_id ON public.gallery_photos(collection_id);
CREATE INDEX idx_photos_user_id ON public.gallery_photos(user_id);

-- Add comments
COMMENT ON TABLE public.gallery_collections IS 'Сборники - коллекции фото и постов пользователя';
COMMENT ON TABLE public.gallery_posts IS 'Посты с HTML контентом и ценой';
COMMENT ON TABLE public.gallery_photos IS 'Фото с ценой и описанием';
COMMENT ON COLUMN public.gallery_collections.thumbnail_url IS 'URL обложки сборника';
COMMENT ON COLUMN public.gallery_posts.title IS 'Название поста';
COMMENT ON COLUMN public.gallery_posts.thumbnail_url IS 'URL обложки поста';
