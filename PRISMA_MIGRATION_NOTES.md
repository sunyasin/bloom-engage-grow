# Переход на Prisma ORM

## Что изменилось

Интеграция YooKassa переведена с Supabase Admin SDK на Prisma ORM для работы с базой данных.

## Стек

**До:**
- Node.js + Express
- @supabase/supabase-js (для БД и Auth)
- YooKassa API

**После:**
- Node.js + Express
- **Prisma** (для БД)
- @supabase/supabase-js (только для Auth)
- YooKassa API

## Ключевые изменения

### 1. Добавлен Prisma

**Файлы:**
- `prisma/schema.prisma` - схема базы данных
- `server/config/database.js` - Prisma Client

**package.json:**
```json
{
  "dependencies": {
    "@prisma/client": "^6.1.0"
  },
  "devDependencies": {
    "prisma": "^6.1.0"
  },
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio"
  }
}
```

### 2. Обновлены контроллеры

**server/controllers/paymentsController.js**

**До (Supabase Admin):**
```javascript
import { supabaseAdmin } from '../config/supabase.js';

const { data: tier, error } = await supabaseAdmin
  .from('subscription_tiers')
  .select('*')
  .eq('id', tierId)
  .single();
```

**После (Prisma):**
```javascript
import { prisma } from '../config/database.js';

const tier = await prisma.subscription_tiers.findUnique({
  where: { id: tierId }
});
```

### 3. Настройки окружения

**Добавлено в .env:**
```env
# Prisma Database URL
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres
```

**Supabase Auth (без изменений):**
```env
SUPABASE_SERVICE_ROLE_KEY=your_key  # Используется только для JWT валидации
```

### 4. Supabase используется только для Auth

**server/middleware/auth.js** - без изменений
```javascript
import { supabaseAdmin } from '../config/supabase.js';

// Валидация JWT токена
const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
```

## Преимущества Prisma

✅ **Type Safety** - автогенерация TypeScript типов
✅ **IntelliSense** - автодополнение в IDE
✅ **Миграции** - версионирование схемы
✅ **Простой синтаксис** - меньше boilerplate кода
✅ **Валидация** - проверка типов на этапе компиляции
✅ **Prisma Studio** - GUI для работы с БД

## Быстрый старт

### 1. Установите зависимости

```bash
npm install
```

### 2. Настройте DATABASE_URL

В `.env` добавьте:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres
```

Где взять пароль:
- Supabase Dashboard → Settings → Database
- Connection string → URI
- Скопируйте весь URL

### 3. Сгенерируйте Prisma Client

```bash
npm run prisma:generate
```

### 4. Запустите проект

```bash
npm run dev:all
```

## Prisma Commands

```bash
# Сгенерировать Client
npm run prisma:generate

# Открыть Prisma Studio (GUI для БД)
npm run prisma:studio

# Синхронизировать схему с БД
npx prisma db push

# Применить миграции
npx prisma migrate dev
```

## Структура схемы

**prisma/schema.prisma:**
```prisma
model communities {
  id                  String                @id
  name                String
  subscription_tiers  subscription_tiers[]
  memberships         memberships[]
  transactions        transactions[]
}

model subscription_tiers {
  id              String        @id
  community_id    String
  name            String
  price_monthly   Decimal?      @db.Decimal(10, 2)
  is_active       Boolean       @default(true)

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
  expires_at               DateTime?

  community                communities         @relation(fields: [community_id], references: [id])
  subscription_tier        subscription_tiers? @relation(fields: [subscription_tier_id], references: [id])
}

model transactions {
  id                   String              @id
  user_id              String
  community_id         String?
  subscription_tier_id String?
  amount               Decimal             @db.Decimal(10, 2)
  status               payment_status      @default(pending)
  provider             String?             @default("yookassa")
  provider_payment_id  String?
  idempotency_key      String?             @unique

  community            communities?        @relation(fields: [community_id], references: [id])
  subscription_tier    subscription_tiers? @relation(fields: [subscription_tier_id], references: [id])
}
```

## Примеры запросов

### Найти одну запись

```javascript
const tier = await prisma.subscription_tiers.findUnique({
  where: { id: tierId }
});
```

### Найти с фильтром

```javascript
const memberships = await prisma.memberships.findMany({
  where: {
    user_id: userId,
    status: 'active'
  }
});
```

### Создать запись

```javascript
const transaction = await prisma.transactions.create({
  data: {
    user_id: userId,
    amount: 1000,
    currency: 'RUB',
    status: 'pending'
  }
});
```

### Обновить запись

```javascript
await prisma.transactions.update({
  where: { id: transactionId },
  data: { status: 'succeeded' }
});
```

### Связи (Include)

```javascript
const memberships = await prisma.memberships.findMany({
  where: { user_id: userId },
  include: {
    subscription_tier: true,
    community: true
  }
});
```

## Совместимость

✅ Все существующие таблицы и данные остаются без изменений
✅ Supabase RLS политики работают как и раньше
✅ Frontend код не требует изменений
✅ API endpoints остаются теми же

## Troubleshooting

### Prisma Client не найден

```bash
npm run prisma:generate
```

### Ошибка подключения к БД

Проверьте DATABASE_URL в .env:
1. Формат: `postgresql://postgres:[PASSWORD]@db.njrhaqycomfsluefnkec.supabase.co:5432/postgres`
2. Пароль корректный (без квадратных скобок)
3. Нет лишних пробелов

### Table does not exist

Таблицы уже существуют в Supabase. Prisma использует их через DATABASE_URL.

## Документация

- **Полное руководство:** `YOOKASSA_PRISMA_INTEGRATION.md`
- **Быстрый старт:** `BACKEND_SETUP.md`
- **Prisma Docs:** https://www.prisma.io/docs
