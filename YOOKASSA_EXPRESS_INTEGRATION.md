# Интеграция ЮKassa с Node.js Express Backend

Полная интеграция платежной системы ЮKassa для оплаты подписок на сообщества с поддержкой карт МИР.

## Архитектура

**Backend:** Node.js + Express
**База данных:** Supabase PostgreSQL (через @supabase/supabase-js)
**Аутентификация:** Supabase Auth с JWT токенами
**Платежная система:** ЮKassa REST API

## Структура проекта

```
project/
├── server/
│   ├── index.js                      # Express сервер
│   ├── config/
│   │   └── supabase.js               # Конфигурация Supabase клиента
│   ├── services/
│   │   └── yookassa.js               # Сервис для работы с ЮKassa API
│   ├── middleware/
│   │   └── auth.js                   # Middleware аутентификации
│   ├── controllers/
│   │   └── paymentsController.js     # Контроллеры платежей
│   └── routes/
│       └── payments.js               # Роуты API
├── src/
│   ├── lib/
│   │   └── paymentsApi.ts            # API клиент для фронтенда
│   ├── components/
│   │   ├── SubscriptionPurchaseButton.tsx
│   │   └── SubscriptionTiersList.tsx
│   └── pages/
│       └── PaymentCallback.tsx       # Страница результата оплаты
└── .env
```

## Backend API Endpoints

### 1. POST /api/payments/create-subscription

Создает платеж в ЮKassa и запись транзакции.

**Аутентификация:** Обязательна (Bearer token)

**Request:**
```json
{
  "communityId": "uuid",
  "subscriptionTierId": "uuid",
  "returnUrl": "https://yourdomain.com/payment/callback" // опционально
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

**Реализация:**
- Проверяет аутентификацию пользователя
- Валидирует subscription tier (активен ли, существует ли)
- Создает запись в transactions со статусом "pending"
- Вызывает YooKassa API для создания платежа
- Возвращает URL для перенаправления пользователя

### 2. POST /api/payments/webhook/yookassa

Обрабатывает webhook уведомления от ЮKassa.

**Аутентификация:** Не требуется (публичный webhook)

**Обрабатываемые события:**
- `payment.succeeded` - Платеж успешно завершен
- `payment.canceled` - Платеж отменен
- `payment.waiting_for_capture` - Ожидание подтверждения

**Логика при payment.succeeded:**
1. Обновляет status транзакции на "succeeded"
2. Создает или обновляет membership:
   - status: "active"
   - started_at: текущее время
   - expires_at: текущее время + 1 месяц
   - renewal_period: "monthly"
   - external_subscription_id: payment_id от ЮKassa

### 3. GET /api/payments/memberships

Получает список подписок текущего пользователя.

**Аутентификация:** Обязательна (Bearer token)

**Query параметры:**
- `communityId` (опционально) - фильтр по сообществу

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
      "isExpired": false,
      "isActive": true,
      "subscription_tier": { ... },
      "community": { ... }
    }
  ]
}
```

## Схема базы данных

### subscription_tiers

```sql
id UUID PRIMARY KEY
community_id UUID REFERENCES communities(id)
name TEXT
slug TEXT
description TEXT
price_monthly NUMERIC
price_yearly NUMERIC
currency TEXT DEFAULT 'RUB'
is_free BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
features JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### memberships

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
community_id UUID REFERENCES communities(id)
subscription_tier_id UUID REFERENCES subscription_tiers(id)
status membership_status DEFAULT 'active'
started_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
renewal_period renewal_period
external_subscription_id TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### transactions

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
community_id UUID REFERENCES communities(id)
subscription_tier_id UUID REFERENCES subscription_tiers(id)
amount NUMERIC
currency TEXT DEFAULT 'RUB'
status payment_status DEFAULT 'pending'
provider TEXT DEFAULT 'yookassa'
provider_payment_id TEXT
idempotency_key TEXT UNIQUE
description TEXT
metadata JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## Установка и настройка

### 1. Установка зависимостей

```bash
npm install
```

Будут установлены:
- `express` - веб-фреймворк
- `cors` - CORS middleware
- `dotenv` - загрузка переменных окружения
- `@supabase/supabase-js` - клиент Supabase
- `nodemon` - auto-reload для разработки (dev dependency)
- `concurrently` - запуск нескольких процессов (dev dependency)

### 2. Настройка переменных окружения

Скопируйте `.env.example` в `.env` и заполните значения:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Supabase Service Role Key (получите в Supabase Dashboard → Settings → API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Backend Configuration
PORT=3001
FRONTEND_URL=http://localhost:5173
VITE_BACKEND_URL=http://localhost:3001

# YooKassa (получите на https://yookassa.ru)
YOOKASSA_SHOP_ID=your_shop_id
YOOKASSA_SECRET_KEY=your_secret_key
```

**Важно:**
- `SUPABASE_SERVICE_ROLE_KEY` имеет полный доступ к БД, НИКОГДА не передавайте его на клиент!
- `VITE_BACKEND_URL` используется фронтендом для подключения к API

### 3. Настройка webhook в ЮKassa

1. Войдите в ЮKassa Dashboard
2. Перейдите в **Настройки → Уведомления**
3. Добавьте URL:
   ```
   http://your-domain.com/api/payments/webhook/yookassa
   ```
   Для локальной разработки используйте ngrok:
   ```bash
   ngrok http 3001
   # Используйте URL: https://xxxxx.ngrok.io/api/payments/webhook/yookassa
   ```
4. Выберите события:
   - ✅ payment.succeeded
   - ✅ payment.canceled
   - ✅ payment.waiting_for_capture

### 4. Применение миграций БД

Миграция для обновления таблицы transactions уже применена. Если нужно применить заново:

```sql
-- См. файл: supabase/migrations/update_transactions_for_yookassa.sql
```

## Запуск проекта

### Разработка

**Вариант 1: Запустить frontend и backend отдельно**

Терминал 1 - Frontend:
```bash
npm run dev
```

Терминал 2 - Backend:
```bash
npm run dev:backend
```

**Вариант 2: Запустить всё одной командой**

```bash
npm run dev:all
```

### Production

```bash
# Build frontend
npm run build

# Start backend
npm run start:backend
```

Backend будет доступен на `http://localhost:3001`
Frontend будет доступен через Vite dev server или после сборки

## Использование в коде

### Frontend: Создание платежа

```typescript
import { paymentsApi } from '@/lib/paymentsApi';

const handleSubscribe = async () => {
  try {
    const result = await paymentsApi.createSubscription({
      communityId: 'uuid',
      subscriptionTierId: 'uuid'
    });

    // Перенаправляем на страницу оплаты ЮKassa
    window.location.href = result.confirmationUrl;
  } catch (error) {
    console.error('Payment error:', error);
  }
};
```

### Frontend: Получение подписок

```typescript
import { paymentsApi } from '@/lib/paymentsApi';

const loadMemberships = async () => {
  try {
    const result = await paymentsApi.getMemberships(communityId);
    const activeMembership = result.memberships.find(m => m.isActive);
    // ...
  } catch (error) {
    console.error('Error loading memberships:', error);
  }
};
```

### Frontend: Компоненты

**Кнопка покупки:**
```tsx
import { SubscriptionPurchaseButton } from '@/components/SubscriptionPurchaseButton';

<SubscriptionPurchaseButton
  communityId={communityId}
  subscriptionTierId={tier.id}
  tierName={tier.name}
  price={tier.price_monthly}
/>
```

**Список тарифов:**
```tsx
import { SubscriptionTiersList } from '@/components/SubscriptionTiersList';

<SubscriptionTiersList
  communityId={communityId}
  userId={user?.id}
/>
```

## Поток оплаты

1. **Пользователь выбирает план подписки**
   - Открывает страницу сообщества
   - Видит доступные планы подписок
   - Нажимает "Subscribe for X ₽/month"

2. **Frontend создает платеж**
   - `paymentsApi.createSubscription()` вызывает backend
   - Backend создает transaction в БД (status: pending)
   - Backend вызывает ЮKassa API
   - Backend возвращает `confirmationUrl`
   - Frontend перенаправляет на страницу ЮKassa

3. **Оплата**
   - Пользователь вводит данные карты МИР
   - ЮKassa обрабатывает платеж
   - ЮKassa перенаправляет обратно на `returnUrl`

4. **Webhook обработка**
   - ЮKassa отправляет webhook на `/api/payments/webhook/yookassa`
   - Backend обновляет transaction (status: succeeded)
   - Backend создает/обновляет membership (status: active)

5. **Подтверждение**
   - Пользователь возвращается на `/payment/callback`
   - Страница проверяет статус транзакции
   - Показывает результат (успех/ошибка)

## Безопасность

### Защита данных

✅ **Service Role Key никогда не передается на клиент**
- Используется только в backend коде
- Хранится в переменных окружения
- Не добавлен в git (.env в .gitignore)

✅ **Аутентификация через JWT**
- Все защищенные endpoint'ы требуют Bearer token
- Токен валидируется через `supabase.auth.getUser()`
- Неверный токен = 401 Unauthorized

✅ **RLS политики**
- Пользователи видят только свои транзакции
- Владельцы сообществ видят транзакции своих сообществ
- Политики настроены в Supabase

✅ **Idempotency**
- `idempotency_key` предотвращает двойную оплату
- ЮKassa гарантирует, что с одним ключом платеж создается один раз

✅ **Платежные данные**
- Никогда не хранятся на нашем сервере
- Обрабатываются только ЮKassa (PCI DSS certified)

### CORS

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

## Тестирование

### Тестовые карты ЮKassa

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

1. Запустите frontend и backend
2. Войдите в систему
3. Откройте любое сообщество
4. Создайте план подписки (если вы владелец)
5. Попробуйте подписаться
6. Используйте тестовую карту
7. Проверьте обратное перенаправление

### Отладка

**Backend логи:**
```bash
# Смотрите консоль где запущен backend
# Все ошибки выводятся с console.error
```

**Проверка транзакций в БД:**
```sql
SELECT * FROM transactions
ORDER BY created_at DESC
LIMIT 10;
```

**Проверка подписок:**
```sql
SELECT * FROM memberships
WHERE status = 'active'
ORDER BY created_at DESC;
```

## Troubleshooting

### Проблема: CORS ошибки

**Решение:**
- Проверьте `FRONTEND_URL` в `.env`
- Убедитесь, что frontend и backend запущены
- Проверьте, что `VITE_BACKEND_URL` указывает на правильный адрес

### Проблема: 401 Unauthorized

**Решение:**
- Убедитесь, что пользователь авторизован
- Проверьте, что токен передается в заголовке Authorization
- Проверьте `SUPABASE_SERVICE_ROLE_KEY` в `.env`

### Проблема: Webhook не работает

**Решение:**
- Для локальной разработки используйте ngrok
- Проверьте URL webhook в ЮKassa Dashboard
- Проверьте логи backend при получении webhook
- Убедитесь, что события настроены в ЮKassa

### Проблема: Payment не создается

**Решение:**
- Проверьте `YOOKASSA_SHOP_ID` и `YOOKASSA_SECRET_KEY`
- Проверьте логи backend
- Убедитесь, что subscription tier активен и существует

## Production Deployment

### Подготовка к запуску

1. ✅ Получить боевые ключи ЮKassa
2. ✅ Настроить webhook URL (production домен)
3. ✅ Установить переменные окружения на сервере
4. ✅ Настроить CORS для production домена
5. ✅ Настроить HTTPS
6. ✅ Настроить reverse proxy (nginx)
7. ✅ Запустить backend как service (systemd/pm2)
8. ✅ Настроить мониторинг и логирование

### Пример nginx конфигурации

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend (статика)
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 (Process Manager)

```bash
# Установка
npm install -g pm2

# Запуск backend
pm2 start server/index.js --name "yookassa-backend"

# Автозапуск при перезагрузке
pm2 startup
pm2 save

# Логи
pm2 logs yookassa-backend
```

## API Reference

### YooKassaService

```javascript
import { yookassaService } from './services/yookassa.js';

// Создать платеж
const payment = await yookassaService.createPayment({
  amount: 1000,
  description: 'Описание платежа',
  returnUrl: 'https://site.com/callback',
  metadata: { userId: 'uuid', ... },
  idempotencyKey: 'unique-key'
});

// Получить информацию о платеже
const payment = await yookassaService.getPayment(paymentId);
```

### Helper функции

```javascript
import { getUserCommunityMembership } from './controllers/paymentsController.js';

// Проверить, есть ли у пользователя активная подписка
const membership = await getUserCommunityMembership(userId, communityId);

if (membership) {
  // Доступ разрешен
} else {
  // Доступ запрещен
}
```

## Дополнительные возможности

### Годовые подписки

Поддерживаются через `price_yearly` в subscription_tiers. Для активации:

1. Добавьте UI для выбора периода (месяц/год)
2. Измените логику в контроллере:
   ```javascript
   const amount = period === 'yearly'
     ? tier.price_yearly
     : tier.price_monthly;

   const expiresAt = new Date();
   if (period === 'yearly') {
     expiresAt.setFullYear(expiresAt.getFullYear() + 1);
   } else {
     expiresAt.setMonth(expiresAt.getMonth() + 1);
   }
   ```

### Промокоды

Создайте таблицу promo_codes и добавьте проверку в контроллер:

```javascript
if (promoCode) {
  const promo = await validatePromoCode(promoCode);
  if (promo) {
    amount = applyDiscount(amount, promo);
  }
}
```

### Автопродление

Используйте рекуррентные платежи ЮKassa:

```javascript
const paymentData = {
  ...
  save_payment_method: true,
  // Дополнительные параметры подписки
};
```

## Полезные ссылки

- [ЮKassa API Documentation](https://yookassa.ru/developers/api)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Ngrok для локального тестирования](https://ngrok.com/)

## Лицензия

При использовании убедитесь, что:
- ✅ У вас есть договор с ЮKassa
- ✅ На сайте указаны условия возврата
- ✅ Есть политика конфиденциальности
- ✅ Соблюдаются правила обработки платежей
