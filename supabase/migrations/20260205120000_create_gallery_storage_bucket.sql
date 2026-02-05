-- Создание storage bucket для галереи
-- Выполните этот SQL в Supabase SQL Editor

-- Создаём bucket 'gallery_public' для изображений галереи
-- Публичный bucket для чтения всеми, записи только аутентифицированными пользователями
begin;
  -- Создаём bucket если не существует
  if not exists (
    select 1 from storage.buckets where id = 'gallery_public'
  ) then
    insert into storage.buckets (id, name, public)
    values ('gallery_public', 'gallery_public', true);
  end if;

  -- Включаем RLS на bucket
  alter table storage.objects enable row level security;

  -- Удаляем старые политики если есть
  drop policy if exists "Gallery images are viewable by everyone" on storage.objects;
  drop policy if exists "Authenticated users can upload gallery images" on storage.objects;

  -- Создаём политику для публичного чтения - любой может просматривать изображения
  create policy "Gallery images are viewable by everyone"
    on storage.objects for select
    using ( bucket_id = 'gallery-public' );

  -- Политика для авторизованных пользователей - загрузка файлов
  -- Проверяем что пользователь авторизован через auth.uid()
  create policy "Authenticated users can upload gallery images"
    on storage.objects for insert
    with check ( bucket_id = 'gallery-public' and auth.role() = 'authenticated' );

commit;
