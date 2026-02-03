-- Создание storage bucket для галереи и публичных файлов
-- Выполните этот SQL в Supabase SQL Editor

-- Создаём bucket 'public-files' для загрузки изображений галереи
-- Публичный bucket для чтения всеми, записи только аутентифицированными пользователями
begin;
  -- Создаём bucket если не существует
  if not exists (
    select 1 from storage.buckets where id = 'public-files'
  ) then
    insert into storage.buckets (id, name, public)
    values ('public-files', 'public-files', true);
  end if;

  -- Включаем RLS на bucket
  alter table storage.objects enable row level security;

  -- Создаём политику для публичного чтения
  create policy "Public files are viewable by everyone"
    on storage.objects for select
    using ( bucket_id = 'public-files' );

  -- Политика для аутентифицированных пользователей - загрузка файлов
  create policy "Authenticated users can upload files"
    on storage.objects for insert
    with check ( bucket_id = 'public-files' and auth.role() = 'authenticated' );

  -- Полития для владельца файла - обновление/удаление
  create policy "Users can update own files"
    on storage.objects for update
    using ( bucket_id = 'public-files' and auth.uid() = owner );

  create policy "Users can delete own files"
    on storage.objects for delete
    using ( bucket_id = 'public-files' and auth.uid() = owner );
commit;
