# Интеграция ЮKassa с Node.js Express + Prisma

Полная интеграция платежной системы ЮKassa для оплаты подписок на сообщества с поддержкой карт МИР.

## Стек технологий

- **Backend:** Node.js + Express
- **ORM:** Prisma
- **База данных:** Supabase PostgreSQL
- **Аутентификация:** Supabase Auth (@supabase/supabase-js) с JWT
- **Платежи:** ЮKassa REST API

## Архитектура

```
Frontend (React + Vite)
    ↓ JWT Token
Backend (Node.js + Express)
    ├── Authentication (Supabase Auth)
    ├── Database (Prisma → PostgreSQL)
    └── Payments (YooKassa API)
```

## Установка

### 1. Установите зависимости

```bash
npm install
```

### 2. Настройте переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```env
# Supabase (Frontend + Auth)
VITE_SUPABASE_URL=https://npezwndlklnbjkmenahw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Supabase Auth (Backend Only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Prisma Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres

# Backend
PORT=3001
FRONTEND_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3001

# YooKassa
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

**Где взять DATABASE_URL:**
1. Откройте Supabase Dashboard → Settings → Database
2. Скопируйте Connection string → URI
3. Замените `[YOUR-PASSWORD]` на ваш пароль

### 3. Сгенерируйте Prisma Client

```bash
npm run prisma:generate
```

### 4. Запустите проект

**Оба сервера вместе:**
```bash
npm run dev:all
```

**Отдельно:**
```bash
npm run dev          # Frontend (терминал 1)
npm run dev:backend  # Backend (терминал 2)
```

## Структура проекта

```
project/
├── prisma/
│   └── schema.prisma              # Prisma схема БД
├── server/
│   ├── index.js                   # Express сервер
│   ├── config/
│   │   ├── database.js            # Prisma Client
│   │   └── supabase.js            # Supabase Auth Client
│   ├── services/
│   │   └── yookassa.js            # YooKassa API сервис
│   ├── middleware/
│   │   └── auth.js                # JWT аутентификация
│   ├── controllers/
│   │   └── paymentsController.js  # Контроллеры платежей
│   └── routes/
│       └── payments.js            # API роуты
└── src/
    ├── lib/
    │   └── paymentsApi.ts         # API клиент для фронтенда
    ├── components/
    │   ├── SubscriptionPurchaseButton.tsx
    │   └── SubscriptionTiersList.tsx
    └── pages/
        └── PaymentCallback.tsx    # Страница результата оплаты
```

## API Endpoints

### POST /api/payments/create-subscription

Создание платежа в ЮKassa.

**Требуется:** JWT токен в `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "communityId": "uuid",
  "subscriptionTierId": "uuid",
  "returnUrl": "https://site.com/payment/callback" // опционально
}
```

**Response:**
```json
{
  "confirmationUrl": "https://yookassa.ru/checkout/...",
  "transactionId": "uuid",
  "paymentId": "yookassa_payment_id"
}
```

**Логика:**
1. Валидирует subscription tier и community через Prisma
2. Создает transaction (status: 'pending')
3. Создает платеж в ЮKassa API
4. Возвращает URL для редиректа

### POST /api/payments/webhook/yookassa

Webhook для уведомлений от ЮKassa.

**Публичный endpoint** (без аутентификации)

**Обрабатываемые события:**
- `payment.succeeded` → Создает/обновляет membership
- `payment.canceled` → Обновляет status транзакции
- `payment.waiting_for_capture` → Логирует событие

**Логика при payment.succeeded:**
```javascript
1. Находит transaction по provider_payment_id
2. Обновляет status → 'succeeded'
3. Проверяет наличие membership
4. Создает или обновляет membership:
   - status: 'active'
   - started_at: now
   - expires_at: now + 1 месяц
   - renewal_period: 'monthly'
```

### GET /api/payments/memberships

Получение подписок пользователя.

**Требуется:** JWT токен

**Query параметры:**
- `communityId` (опционально)

**Response:**
```json
{
  "memberships": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "community_id": "uuid",
      "subscription_tier_id": "uuid",
      "status": "active",
      "started_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-02-01T00:00:00Z",
      "renewal_period": "monthly",
      "external_subscription_id": "yookassa_id",
      "isExpired": false,
      "isActive": true,
      "subscription_tier": { ... },
      "community": { ... }
    }
  ]
}
```

## Prisma Schema

### Основные модели

```prisma
model communities {
  id                  String                @id @default(dbgenerated("gen_random_uuid()"))
  name                String
  slug                String?               @unique
  subscription_tiers  subscription_tiers[]
  memberships         memberships[]
  transactions        transactions[]
}

model subscription_tiers {
  id              String        @id
  community_id    String
  name            String
  slug            String
  price_monthly   Decimal?      @db.Decimal(10, 2)
  price_yearly    Decimal?      @db.Decimal(10, 2)
  currency        String        @default("RUB")
  is_free         Boolean       @default(false)
  is_active       Boolean       @default(true)
  features        Json?         @default("[]")

  community       communities   @relation(fields: [community_id], references: [id])
  memberships     memberships[]
  transactions    transactions[]
}

model memberships {
  id                       String              @id
  user_id                  String
  community_id             String
  subscription_tier_id     String?
  status                   membership_status   @default(active)
  started_at               DateTime            @default(now())
  expires_at               DateTime?
  renewal_period           renewal_period      @default(monthly)
  external_subscription_id String?

  community                communities         @relation(fields: [community_id], references: [id])
  subscription_tier        subscription_tiers? @relation(fields: [subscription_tier_id], references: [id])

  @@unique([user_id, community_id])
}

model transactions {
  id                   String              @id
  user_id              String
  community_id         String?
  subscription_tier_id String?
  amount               Decimal             @db.Decimal(10, 2)
  currency             String              @default("RUB")
  status               payment_status      @default(pending)
  provider             String?             @default("yookassa")
  provider_payment_id  String?
  idempotency_key      String?             @unique
  description          String?
  metadata             Json?
  created_at           DateTime            @default(now())
  updated_at           DateTime?           @default(now())

  community            communities?        @relation(fields: [community_id], references: [id])
  subscription_tier    subscription_tiers? @relation(fields: [subscription_tier_id], references: [id])

  @@index([provider_payment_id])
  @@index([user_id])
  @@index([status])
}
```

### Enums

```prisma
enum membership_status {
  active
  canceled
  expired
  trial
}

enum renewal_period {
  monthly
  yearly
  lifetime
}

enum payment_status {
  pending
  paid
  failed
  refunded
  succeeded
  canceled
}
```

## Prisma Commands

```bash
# Сгенерировать Prisma Client
npm run prisma:generate

# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio

# Применить миграции (если нужно)
npx prisma migrate dev

# Синхронизировать схему с БД
npx prisma db push
```

## Использование Prisma в коде

### Создание записи

```javascript
import { prisma } from '../config/database.js';

const transaction = await prisma.transactions.create({
  data: {
    user_id: userId,
    community_id: communityId,
    amount: 1000,
    currency: 'RUB',
    status: 'pending'
  }
});
```

### Поиск записей

```javascript
// Найти одну запись
const tier = await prisma.subscription_tiers.findUnique({
  where: { id: tierId }
});

// Найти первую подходящую
const membership = await prisma.memberships.findFirst({
  where: {
    user_id: userId,
    status: 'active'
  }
});

// Найти все с условиями
const memberships = await prisma.memberships.findMany({
  where: { user_id: userId },
  include: {
    subscription_tier: true,
    community: true
  }
});
```

### Обновление записи

```javascript
await prisma.transactions.update({
  where: { id: transactionId },
  data: { status: 'succeeded' }
});
```

### Связи (Relations)

```javascript
// Include связанные таблицы
const membership = await prisma.memberships.findFirst({
  where: { id: membershipId },
  include: {
    subscription_tier: true,  // Включить subscription_tier
    community: true           // Включить community
  }
});

// Результат:
// {
//   id: "...",
//   subscription_tier: { name: "Pro", price_monthly: 1000, ... },
//   community: { name: "My Community", ... }
// }
```

## Аутентификация

### Backend: Проверка JWT

```javascript
// server/middleware/auth.js
import { supabaseAdmin } from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;  // Теперь доступен в контроллере
  next();
};
```

### Frontend: Отправка запроса

```typescript
// src/lib/paymentsApi.ts
const token = await getAuthToken();

const response = await fetch(`${API_URL}/api/payments/create-subscription`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

## Настройка Webhook

### Локальная разработка (ngrok)

```bash
# Установите ngrok
npm install -g ngrok

# Запустите туннель
ngrok http 3001

# Скопируйте URL (например: https://abc123.ngrok.io)
```

### Настройка в ЮKassa Dashboard

1. Перейдите на https://yookassa.ru
2. Настройки → Уведомления
3. Добавьте URL:
   ```
   https://abc123.ngrok.io/api/payments/webhook/yookassa
   ```
4. Выберите события:
   - ✅ payment.succeeded
   - ✅ payment.canceled
   - ✅ payment.waiting_for_capture

### Production

Замените ngrok URL на реальный домен:
```
https://yourdomain.com/api/payments/webhook/yookassa
```

## Тестирование

### Тестовые карты МИР

**Успешная оплата:**
```
Номер: 5555 5555 5555 4444
Срок: 12/25
CVC: 123
```

**Отклоненная оплата:**
```
Номер: 5555 5555 5555 4477
Срок: 12/25
CVC: 123
```

### Проверка работы

1. Запустите `npm run dev:all`
2. Откройте http://localhost:5173
3. Войдите в систему
4. Перейдите в сообщество
5. Создайте subscription tier (если владелец)
6. Попробуйте подписаться
7. Используйте тестовую карту
8. Проверьте редирект на `/payment/callback`

### Отладка

**Проверка транзакций:**
```bash
npm run prisma:studio
# Откройте таблицу transactions
```

**Логи backend:**
```bash
# Все ошибки выводятся в консоль
npm run dev:backend
```

**Проверка webhook:**
```javascript
// В контроллере добавлен лог:
console.log(`Payment succeeded for transaction ${transaction.id}`);
```

## Отличия от Supabase Admin

| Операция | Supabase Admin | Prisma |
|----------|----------------|---------|
| Найти одну запись | `.select().eq('id', id).single()` | `.findUnique({ where: { id } })` |
| Создать запись | `.insert(data).select()` | `.create({ data })` |
| Обновить запись | `.update(data).eq('id', id)` | `.update({ where: { id }, data })` |
| Найти с фильтром | `.select().eq('status', 'active')` | `.findMany({ where: { status: 'active' } })` |
| Связи | `.select('*, tier:tiers(*)')` | `.findMany({ include: { tier: true } })` |
| Ошибки | `{ data, error }` | `try/catch` |

## Преимущества Prisma

✅ **Type Safety** - Автогенерация TypeScript типов
✅ **Миграции** - Версионирование схемы БД
✅ **Связи** - Простая работа с relations
✅ **IntelliSense** - Автодополнение в IDE
✅ **Валидация** - Проверка типов на этапе компиляции
✅ **Производительность** - Оптимизированные запросы
✅ **Debugging** - Логирование SQL запросов
✅ **Studio** - GUI для работы с БД

## Troubleshooting

### Prisma Client не сгенерирован

```bash
npm run prisma:generate
```

### Ошибка DATABASE_URL

Проверьте:
1. Пароль корректный
2. URL формат: `postgresql://postgres:[PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres`
3. Нет лишних пробелов в .env

### Ошибка "Table does not exist"

Prisma использует существующие таблицы из Supabase. Миграции уже применены через Supabase Dashboard.

### 401 Unauthorized

Проверьте:
1. `SUPABASE_SERVICE_ROLE_KEY` в .env
2. Токен передается в заголовке
3. Пользователь авторизован на фронтенде

### CORS ошибки

Проверьте `FRONTEND_URL` в .env совпадает с реальным адресом frontend

## Production Deployment

### Чек-лист

1. ✅ Получить боевые ключи ЮKassa
2. ✅ Настроить webhook на production URL
3. ✅ Установить переменные окружения
4. ✅ Сгенерировать Prisma Client на сервере
5. ✅ Настроить reverse proxy (nginx)
6. ✅ Запустить backend через PM2
7. ✅ Настроить SSL (Let's Encrypt)

### PM2 Setup

```bash
npm install -g pm2

# Запуск
pm2 start server/index.js --name yookassa-backend

# Автозапуск при перезагрузке
pm2 startup
pm2 save

# Мониторинг
pm2 logs yookassa-backend
pm2 monit
```

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
FRONTEND_URL=https://yourdomain.com
PORT=3001
```

## Дополнительные возможности

### Годовые подписки

```javascript
const amount = period === 'yearly'
  ? Number(tier.price_yearly)
  : Number(tier.price_monthly);

const expiresAt = new Date();
if (period === 'yearly') {
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
} else {
  expiresAt.setMonth(expiresAt.getMonth() + 1);
}
```

### Промокоды

Создайте таблицу `promo_codes` в Prisma:

```prisma
model promo_codes {
  id             String   @id
  code           String   @unique
  discount_type  String   // 'percent' или 'fixed'
  discount_value Decimal  @db.Decimal(10, 2)
  max_uses       Int?
  used_count     Int      @default(0)
  valid_from     DateTime?
  valid_to       DateTime?
}
```

## Полезные ссылки

- [ЮKassa API Docs](https://yookassa.ru/developers/api)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Express Guide](https://expressjs.com/)

## Лицензия и юридические требования

При использовании убедитесь что:
- ✅ У вас есть договор с ЮKassa
- ✅ На сайте указаны условия возврата
- ✅ Есть политика конфиденциальности
- ✅ Соблюдаются правила обработки платежей
- ✅ Данные карт НЕ хранятся на вашем сервере (PCI DSS)
