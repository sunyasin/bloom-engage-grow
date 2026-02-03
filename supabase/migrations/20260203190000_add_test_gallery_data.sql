-- Insert test gallery collections for community owner
-- Community ID: f3676293-e176-44fb-af9e-85d56da2e181
-- Assuming owner is creator_id from communities table

-- First, get the owner ID from the community
-- Replace with actual owner_id from communities table where id = 'f3676293-e176-44fb-af9e-85d56da2e181'
-- For now using a placeholder user ID - replace with actual creator_id

-- Collection 1: "Весенняя коллекция 2025"
INSERT INTO public.gallery_collections (name, year, thumbnail_url, community_id, user_id, created_at, updated_at)
SELECT 
  'Весенняя коллекция 2025',
  2025,
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=500&fit=crop',
  'f3676293-e176-44fb-af9e-85d56da2e181',
  creator_id,
  NOW(),
  NOW()
FROM public.communities 
WHERE id = 'f3676293-e176-44fb-af9e-85d56da2e181'
ON CONFLICT DO NOTHING;

-- Collection 2: "Летняя коллекция 2025"
INSERT INTO public.gallery_collections (name, year, thumbnail_url, community_id, user_id, created_at, updated_at)
SELECT 
  'Летняя коллекция 2025',
  2025,
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=500&fit=crop',
  'f3676293-e176-44fb-af9e-85d56da2e181',
  creator_id,
  NOW(),
  NOW()
FROM public.communities 
WHERE id = 'f3676293-e176-44fb-af9e-85d56da2e181'
ON CONFLICT DO NOTHING;

-- Insert sample posts for the first collection
-- Get the collection ID
DO $$
DECLARE
  collection1_id BIGINT;
  collection2_id BIGINT;
  owner_uuid UUID;
BEGIN
  -- Get owner UUID
  SELECT creator_id INTO owner_uuid FROM public.communities WHERE id = 'f3676293-e176-44fb-af9e-85d56da2e181';
  
  -- Get collection IDs
  SELECT id INTO collection1_id FROM public.gallery_collections 
  WHERE community_id = 'f3676293-e176-44fb-af9e-85d56da2e181' AND name = 'Весенняя коллекция 2025'
  LIMIT 1;
  
  SELECT id INTO collection2_id FROM public.gallery_collections 
  WHERE community_id = 'f3676293-e176-44fb-af9e-85d56da2e181' AND name = 'Летняя коллекция 2025'
  LIMIT 1;
  
  -- Insert sample posts for Collection 1
  IF collection1_id IS NOT NULL THEN
    INSERT INTO public.gallery_posts (title, thumbnail_url, content_html, price, currency, collection_id, user_id, created_at, updated_at)
    VALUES (
      'Новинки сезона',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=300&fit=crop',
      '<p>Представляем наши новинки весеннего сезона!</p>',
      1500.00,
      'RUB',
      collection1_id,
      owner_uuid,
      NOW(),
      NOW()
    );
    
    INSERT INTO public.gallery_posts (title, thumbnail_url, content_html, price, currency, collection_id, user_id, created_at, updated_at)
    VALUES (
      'Хиты продаж',
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
      '<p>Самые популярные товары этого месяца</p>',
      2500.00,
      'RUB',
      collection1_id,
      owner_uuid,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Insert sample posts for Collection 2
  IF collection2_id IS NOT NULL THEN
    INSERT INTO public.gallery_posts (title, thumbnail_url, content_html, price, currency, collection_id, user_id, created_at, updated_at)
    VALUES (
      'Летняя распродажа',
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=300&fit=crop',
      '<p>Отличные скидки на летние коллекции!</p>',
      3000.00,
      'RUB',
      collection2_id,
      owner_uuid,
      NOW(),
      NOW()
    );
  END IF;
  
  -- Insert sample photos for Collection 1
  IF collection1_id IS NOT NULL THEN
    INSERT INTO public.gallery_photos (url, description, price, currency, collection_id, user_id, created_at)
    VALUES (
      'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=600&h=800&fit=crop',
      'Стильный весенний образ',
      5000.00,
      'RUB',
      collection1_id,
      owner_uuid,
      NOW()
    );
    
    INSERT INTO public.gallery_photos (url, description, price, currency, collection_id, user_id, created_at)
    VALUES (
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop',
      'Яркие аксессуары',
      2500.00,
      'RUB',
      collection1_id,
      owner_uuid,
      NOW()
    );
  END IF;
  
  -- Insert sample photos for Collection 2
  IF collection2_id IS NOT NULL THEN
    INSERT INTO public.gallery_photos (url, description, price, currency, collection_id, user_id, created_at)
    VALUES (
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=800&fit=crop',
      'Летний гардероб',
      4500.00,
      'RUB',
      collection2_id,
      owner_uuid,
      NOW()
    );
    
    INSERT INTO public.gallery_photos (url, description, price, currency, collection_id, user_id, created_at)
    VALUES (
      'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=800&fit=crop',
      'Пляжная коллекция',
      3500.00,
      'RUB',
      collection2_id,
      owner_uuid,
      NOW()
    );
  END IF;
END $$;
