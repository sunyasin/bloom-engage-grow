# Руководство по интеграции ЮKassa

Полная интеграция платежной системы ЮKassa для оплаты подписок на сообщества с поддержкой карт МИР.

## Важное замечание по архитектуре

**Данное решение использует:**
- **Backend:** Supabase Edge Functions (Deno runtime) вместо Node.js/Express
- **База данных:** Прямой доступ к Supabase PostgreSQL через REST API вместо Prisma ORM
- **Аутентификация:** Supabase Auth с JWT токенами

Это обусловлено архитектурой Supabase и является рекомендуемым подходом для serverless решений.

## Архитектура решения

### Backend (Supabase Edge Functions)

Созданы три Edge Functions:

#### 1. create-payment
**URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/create-payment`

Создает платеж в ЮKassa и запись в таблице transactions.

**Метод:** POST
**Аутентификация:** Обязательна (Bearer token)

**Request Body:**
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

#### 2. yookassa-webhook
**URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/yookassa-webhook`

Обрабатывает webhooks от ЮKassa о статусе платежей.

**Метод:** POST
**Аутентификация:** Не требуется (публичный webhook)

**События:**
- `payment.succeeded` - платеж успешно завершен
- `payment.canceled` - платеж отменен
- `payment.waiting_for_capture` - ожидание подтверждения

#### 3. get-memberships
**URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/get-memberships`

Получает список подписок пользователя.

**Метод:** GET
**Аутентификация:** Обязательна (Bearer token)

**Query Parameters:**
- `communityId` (опционально) - фильтр по сообществу

**Response:**
```json
{
  "memberships": [
    {
      "id": "uuid",
      "community_id": "uuid",
      "subscription_tier_id": "uuid",
      "status": "active",
      "started_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-02-01T00:00:00Z",
      "isExpired": false,
      "isActive": true,
      "subscription_tier": { ... },
      "community": { ... }
    }
  ]
}
```

## Схема базы данных

### Таблица: subscription_tiers

Планы подписок для сообществ.

```sql
TABLE subscription_tiers (
  id UUID PRIMARY KEY,
  community_id UUID REFERENCES communities(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  currency TEXT DEFAULT 'RUB',
  is_free BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(community_id, slug)
);
```

### Таблица: memberships

Активные подписки пользователей.

```sql
TABLE memberships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  community_id UUID REFERENCES communities(id),
  subscription_tier_id UUID REFERENCES subscription_tiers(id),
  status membership_status DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  renewal_period renewal_period,
  external_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, community_id)
);
```

**Enums:**
- `membership_status`: 'active', 'canceled', 'expired', 'trial'
- `renewal_period`: 'monthly', 'yearly', 'lifetime'

### Таблица: transactions

История всех платежных операций.

```sql
TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  community_id UUID REFERENCES communities(id),
  subscription_tier_id UUID REFERENCES subscription_tiers(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'RUB',
  status payment_status DEFAULT 'pending',
  provider TEXT DEFAULT 'yookassa',
  provider_payment_id TEXT,
  idempotency_key TEXT UNIQUE,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Enum payment_status:** 'pending', 'succeeded', 'paid', 'failed', 'refunded', 'canceled'

**Индексы:**
- `idx_transactions_provider_payment_id` на `provider_payment_id`
- `idx_transactions_user_id` на `user_id`
- `idx_transactions_status` на `status`

## Настройка

### 1. Регистрация в ЮKassa

1. Зарегистрируйтесь на https://yookassa.ru
2. Перейдите в раздел **"Настройки"** → **"Протокол API"**
3. Получите:
   - **shopId** (идентификатор магазина)
   - **Секретный ключ** (secret key)

### 2. Настройка секретов в Supabase

1. Откройте Supabase Dashboard
2. Перейдите в **"Edge Functions"** → **"Secrets"**
3. Добавьте следующие секреты:

```bash
YOOKASSA_SHOP_ID = ваш_shop_id
YOOKASSA_SECRET_KEY = ваш_секретный_ключ
FRONTEND_URL = http://localhost:5173  # или ваш production домен
```

**Важно:** Переменные `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` уже настроены автоматически.

### 3. Настройка Webhook в ЮKassa

1. В ЮKassa Dashboard откройте **"Настройки"** → **"Уведомления"**
2. Добавьте URL:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/yookassa-webhook
   ```
3. Выберите события:
   - ✅ payment.succeeded
   - ✅ payment.canceled
   - ✅ payment.waiting_for_capture

### 4. Настройка локального окружения

Обновите файл `.env` в корне проекта:

```env
# YooKassa Payment Configuration
YOOKASSA_SHOP_ID=your_shop_id_here
YOOKASSA_SECRET_KEY=your_secret_key_here
FRONTEND_URL=http://localhost:5173
```

## Процесс оплаты

### Пошаговая инструкция

1. **Пользователь выбирает план подписки**
   - Открывает страницу сообщества
   - Переходит на вкладку "Подписки"
   - Выбирает подходящий план

2. **Инициация платежа**
   - Клик на кнопку "Subscribe for X ₽/month"
   - Frontend вызывает `POST /functions/v1/create-payment`
   - Edge function создает запись в `transactions` со статусом `pending`
   - Создается платеж в ЮKassa через API
   - Возвращается `confirmationUrl`

3. **Перенаправление на оплату**
   - `window.location.href = confirmationUrl`
   - Пользователь попадает на страницу ЮKassa
   - Вводит данные карты МИР и оплачивает

4. **Обработка результата**
   - После оплаты ЮKassa перенаправляет на `returnUrl`
   - ЮKassa отправляет webhook на `yookassa-webhook`
   - Edge function обновляет статус транзакции
   - Создается/обновляется запись в `memberships`

5. **Подтверждение**
   - Страница `/payment/callback` проверяет статус
   - Показывает результат пользователю
   - Предлагает перейти в сообщество

### Диаграмма последовательности

```
User → Frontend: Клик "Subscribe"
Frontend → create-payment: POST {communityId, tierId}
create-payment → DB: INSERT transactions (status=pending)
create-payment → YooKassa API: POST /payments
YooKassa API → create-payment: {confirmationUrl, paymentId}
create-payment → DB: UPDATE transactions SET provider_payment_id
create-payment → Frontend: {confirmationUrl}
Frontend → YooKassa: Redirect to confirmationUrl

User → YooKassa: Оплата картой МИР
YooKassa → yookassa-webhook: POST {payment.succeeded}
yookassa-webhook → DB: UPDATE transactions SET status=succeeded
yookassa-webhook → DB: INSERT/UPDATE memberships
YooKassa → Frontend: Redirect to returnUrl

Frontend → get-memberships: GET memberships
get-memberships → Frontend: {memberships}
Frontend → User: Показать результат
```

## Компоненты Frontend

### 1. SubscriptionPurchaseButton

Кнопка для покупки подписки.

```tsx
import { SubscriptionPurchaseButton } from "@/components/SubscriptionPurchaseButton";

<SubscriptionPurchaseButton
  communityId="uuid"
  subscriptionTierId="uuid"
  tierName="Premium"
  price={999}
  disabled={false}
  className="w-full"
/>
```

### 2. SubscriptionTiersList

Список планов подписок с кнопками покупки.

```tsx
import { SubscriptionTiersList } from "@/components/SubscriptionTiersList";

<SubscriptionTiersList
  communityId="uuid"
  userId={user?.id}
/>
```

### 3. PaymentCallback

Страница результата оплаты (роут `/payment/callback`).

Автоматически:
- Извлекает `transactionId` из query параметров
- Проверяет статус транзакции
- Показывает результат (успех/ошибка)
- Предлагает перейти в сообщество

## Row Level Security (RLS)

### Необходимые политики

Для корректной работы нужно настроить RLS политики:

#### transactions

```sql
-- Пользователи могут видеть свои транзакции
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Владельцы сообществ видят транзакции своих сообществ
CREATE POLICY "Community owners can view transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE communities.id = transactions.community_id
      AND communities.creator_id = auth.uid()
    )
  );
```

#### memberships

```sql
-- Пользователи могут видеть свои подписки
CREATE POLICY "Users can view own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Владельцы сообществ видят подписки в своих сообществах
CREATE POLICY "Community owners can view memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE communities.id = memberships.community_id
      AND communities.creator_id = auth.uid()
    )
  );
```

#### subscription_tiers

```sql
-- Все могут видеть активные планы
CREATE POLICY "Anyone can view active tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Владельцы сообществ могут управлять планами
CREATE POLICY "Community owners can manage tiers"
  ON subscription_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM communities
      WHERE communities.id = subscription_tiers.community_id
      AND communities.creator_id = auth.uid()
    )
  );
```

## Тестирование

### Локальное тестирование

1. Запустите проект:
   ```bash
   npm run dev
   ```

2. Войдите в систему

3. Создайте сообщество (если еще нет)

4. Как владелец сообщества:
   - Перейдите в сообщество
   - Нажмите "Настройки подписок"
   - Создайте план подписки с ценой (например, 100 ₽)

5. Как обычный пользователь:
   - Откройте сообщество
   - Перейдите на вкладку "Подписки"
   - Нажмите "Subscribe"
   - Используйте тестовую карту

### Тестовые карты ЮKassa

**Успешная оплата:**
```
Номер: 5555 5555 5555 4444
Срок: любая дата в будущем (например, 12/25)
CVC: любые 3 цифры (например, 123)
```

**Отклоненная оплата:**
```
Номер: 5555 5555 5555 4477
Срок: любая дата в будущем
CVC: любые 3 цифры
```

**3-D Secure:**
```
Номер: 5555 5555 5555 5599
Код подтверждения: любой
```

### Проверка работы webhook

1. В Supabase Dashboard откройте **"Edge Functions"** → **"yookassa-webhook"** → **"Logs"**

2. После оплаты проверьте логи:
   - Должен появиться запрос от ЮKassa
   - Статус 200 OK
   - Логи обработки

3. Проверьте базу данных:
   ```sql
   SELECT * FROM transactions ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM memberships ORDER BY created_at DESC LIMIT 5;
   ```

## Мониторинг и отладка

### Логи Edge Functions

1. Откройте Supabase Dashboard
2. **Edge Functions** → выберите функцию → **Logs**
3. Отслеживайте ошибки и предупреждения

### Проверка транзакций

```sql
-- Последние транзакции
SELECT
  t.id,
  t.status,
  t.amount,
  t.provider_payment_id,
  t.created_at,
  p.email,
  c.name as community_name,
  st.name as tier_name
FROM transactions t
LEFT JOIN profiles p ON t.user_id = p.id
LEFT JOIN communities c ON t.community_id = c.id
LEFT JOIN subscription_tiers st ON t.subscription_tier_id = st.id
ORDER BY t.created_at DESC
LIMIT 10;
```

### Проверка активных подписок

```sql
-- Активные подписки
SELECT
  m.id,
  m.status,
  m.started_at,
  m.expires_at,
  p.email,
  c.name as community_name,
  st.name as tier_name,
  CASE
    WHEN m.expires_at IS NULL THEN 'never'
    WHEN m.expires_at < now() THEN 'expired'
    ELSE 'active'
  END as actual_status
FROM memberships m
LEFT JOIN profiles p ON m.user_id = p.id
LEFT JOIN communities c ON m.community_id = c.id
LEFT JOIN subscription_tiers st ON m.subscription_tier_id = st.id
WHERE m.status = 'active'
ORDER BY m.started_at DESC;
```

## Troubleshooting

### Проблема: Платеж не создается

**Симптомы:** Ошибка при клике на кнопку "Subscribe"

**Решение:**
1. Проверьте консоль браузера на ошибки
2. Убедитесь, что пользователь авторизован
3. Проверьте секреты в Supabase:
   - `YOOKASSA_SHOP_ID`
   - `YOOKASSA_SECRET_KEY`
4. Проверьте логи edge function `create-payment`

### Проблема: Webhook не обрабатывается

**Симптомы:** Транзакция остается в статусе `pending`

**Решение:**
1. Проверьте URL webhook в ЮKassa Dashboard
2. Убедитесь, что edge function `yookassa-webhook` развернута
3. Проверьте логи функции на наличие ошибок
4. Проверьте, что в настройках ЮKassa включены нужные события

### Проблема: Membership не создается

**Симптомы:** Платеж успешен, но подписка не активна

**Решение:**
1. Проверьте таблицу `transactions` - статус должен быть `succeeded`
2. Проверьте таблицу `memberships`
3. Проверьте логи `yookassa-webhook`
4. Проверьте RLS политики на таблице `memberships`

### Проблема: RLS блокирует доступ

**Симптомы:** Ошибки доступа к данным

**Решение:**
1. Проверьте, что пользователь авторизован
2. Убедитесь, что RLS политики настроены правильно
3. Используйте Service Role Key в edge functions (уже настроено)

## Расширенные возможности

### Автопродление подписок

Для реализации автопродления:

1. Используйте рекуррентные платежи ЮKassa
2. Измените `create-payment` для создания подписки вместо разового платежа:
   ```typescript
   const paymentData = {
     ...
     save_payment_method: true,
     // Дополнительные параметры для подписки
   };
   ```
3. Обрабатывайте события `payment.succeeded` с `recurring = true`

### Промокоды

Для добавления промокодов:

1. Создайте таблицу `promo_codes`:
   ```sql
   CREATE TABLE promo_codes (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     code TEXT UNIQUE NOT NULL,
     discount_percent INTEGER,
     discount_amount NUMERIC,
     valid_from TIMESTAMPTZ,
     valid_to TIMESTAMPTZ,
     max_uses INTEGER,
     used_count INTEGER DEFAULT 0
   );
   ```

2. Добавьте проверку промокода в `create-payment`
3. Примените скидку к цене перед созданием платежа

### Годовые подписки

Уже поддерживаются через поле `price_yearly` в `subscription_tiers`.

Для активации:
1. Обновите UI для выбора периода (месяц/год)
2. В `create-payment` используйте `price_yearly` вместо `price_monthly`
3. Установите `expires_at = now() + interval '1 year'` вместо 1 месяца

## Безопасность

### Защита данных

- ✅ Платежные данные не хранятся на вашем сервере
- ✅ Все данные карт обрабатываются ЮKassa (PCI DSS certified)
- ✅ JWT токены для аутентификации
- ✅ RLS политики защищают данные пользователей

### Защита от дублирования

- ✅ `idempotency_key` предотвращает двойную оплату
- ✅ Unique constraint на `idempotency_key` в таблице `transactions`

### Защита webhook

- ✅ Проверка подлинности данных от ЮKassa
- ✅ Webhook endpoint не требует аутентификации (согласно документации ЮKassa)
- ✅ Можно добавить проверку IP-адресов ЮKassa

## Поддержка

### Документация ЮKassa

- [API Reference](https://yookassa.ru/developers/api)
- [Webhook уведомления](https://yookassa.ru/developers/using-api/webhooks)
- [Тестовые данные](https://yookassa.ru/developers/payment-acceptance/testing-and-going-live/testing)

### Supabase Edge Functions

- [Documentation](https://supabase.com/docs/guides/functions)
- [Examples](https://github.com/supabase/supabase/tree/master/examples/edge-functions)

## Чеклист для запуска в production

- [ ] Получить боевые ключи ЮKassa (не тестовые)
- [ ] Добавить секреты в Supabase Dashboard
- [ ] Настроить webhook URL в ЮKassa
- [ ] Обновить `FRONTEND_URL` на production домен
- [ ] Проверить RLS политики на всех таблицах
- [ ] Протестировать оплату тестовыми картами
- [ ] Настроить мониторинг ошибок
- [ ] Создать резервное копирование данных
- [ ] Добавить обработку ошибок в UI
- [ ] Настроить email уведомления о платежах (опционально)

## Лицензия и соглашения

При использовании ЮKassa убедитесь, что:
- У вас есть договор с ЮKassa
- Вы соблюдаете правила обработки платежей
- На сайте указаны условия возврата
- Есть политика конфиденциальности
