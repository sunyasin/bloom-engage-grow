# Backend Setup - Quick Start Guide

## Стек

- **Runtime:** Node.js + Express
- **ORM:** Prisma
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth (JWT)
- **Payments:** YooKassa

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните:

```env
# Supabase (получите в Supabase Dashboard)
VITE_SUPABASE_URL=https://npezwndlklnbjkmenahw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Prisma Database URL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres

# Backend
PORT=3001
FRONTEND_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3001

# YooKassa (получите на https://yookassa.ru)
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

**Где взять ключи:**
- Supabase Keys: Dashboard → Settings → API
- Database URL: Dashboard → Settings → Database → Connection string → URI
- YooKassa: https://yookassa.ru → Настройки → Протокол API

### 3. Сгенерировать Prisma Client

```bash
npm run prisma:generate
```

### 4. Запуск проекта

**Вариант 1: Frontend и Backend вместе**
```bash
npm run dev:all
```

**Вариант 2: Отдельно**

Терминал 1:
```bash
npm run dev
```

Терминал 2:
```bash
npm run dev:backend
```

### 4. Настройка Webhook (для локальной разработки)

Установите ngrok:
```bash
npm install -g ngrok
ngrok http 3001
```

Скопируйте URL и добавьте в ЮKassa Dashboard:
```
https://xxxxx.ngrok.io/api/payments/webhook/yookassa
```

## Структура Backend

```
prisma/
└── schema.prisma            # Prisma схема БД

server/
├── index.js                 # Express сервер
├── config/
│   ├── database.js         # Prisma Client
│   └── supabase.js         # Supabase Auth Client
├── services/
│   └── yookassa.js         # YooKassa API
├── middleware/
│   └── auth.js             # JWT аутентификация
├── controllers/
│   └── paymentsController.js
└── routes/
    └── payments.js
```

## Prisma Commands

```bash
# Сгенерировать Prisma Client
npm run prisma:generate

# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio
```

## API Endpoints

### POST /api/payments/create-subscription
Создание платежа
- Требует аутентификации
- Body: `{ communityId, subscriptionTierId }`

### POST /api/payments/webhook/yookassa
Webhook от ЮKassa
- Публичный endpoint
- Обрабатывает уведомления о платежах

### GET /api/payments/memberships
Получение подписок пользователя
- Требует аутентификации
- Query: `?communityId=uuid` (опционально)

## Тестирование

### Тестовая карта МИР

```
Номер: 5555 5555 5555 4444
Срок: 12/25
CVC: 123
```

### Проверка работы

1. Запустите frontend и backend
2. Войдите в систему
3. Перейдите в любое сообщество
4. Создайте план подписки (если владелец)
5. Попробуйте подписаться
6. Используйте тестовую карту

## Troubleshooting

### Prisma Client не сгенерирован
```bash
npm run prisma:generate
```

### Ошибка DATABASE_URL
Проверьте:
1. Пароль корректный
2. Формат: `postgresql://postgres:[PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres`
3. Нет лишних пробелов в .env

### CORS ошибки
Проверьте `FRONTEND_URL` в `.env`

### 401 Unauthorized
Проверьте `SUPABASE_SERVICE_ROLE_KEY`

### Webhook не работает
Используйте ngrok для локальной разработки

### Payment не создается
Проверьте ключи ЮKassa в `.env`

## Production

```bash
# Build frontend
npm run build

# Start backend
npm run start:backend
```

Рекомендуется использовать PM2:
```bash
npm install -g pm2
pm2 start server/index.js --name backend
pm2 save
```

## Supabase Storage

Загрузка файлов происходит напрямую из браузера через Supabase Storage - **backend сервер не требуется**.

### Создание Bucket для галереи

1. Откройте Supabase Dashboard → SQL Editor
2. Выполните миграцию: `supabase/migrations/20260205120000_create_gallery_storage_bucket.sql`

Или выполните SQL вручную:

```sql
-- Создаём bucket 'gallery_public' для изображений галереи
begin;
  if not exists (
    select 1 from storage.buckets where id = 'gallery_public'
  ) then
    insert into storage.buckets (id, name, public)
    values ('gallery_public', 'gallery_public', true);
  end if;

  alter table storage.objects enable row level security;

  create policy "Gallery images are viewable by everyone"
    on storage.objects for select
    using ( bucket_id = 'gallery_public' );

  create policy "Authenticated users can upload gallery images"
    on storage.objects for insert
    with check ( bucket_id = 'gallery_public' and auth.role() = 'authenticated' );
commit;
```

### Проверка Storage

```bash
# Проверка через Supabase CLI
supabase storage ls --project-ref your-project-ref
```

## Документация

Полная документация: `YOOKASSA_PRISMA_INTEGRATION.md`
