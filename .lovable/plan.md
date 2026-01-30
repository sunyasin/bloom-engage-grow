
# План реализации партнерской (реферальной) системы

## Описание функционала
Партнерская программа позволяет пользователям получать скидки за привлечение подписчиков:
- **-10%** пожизненно за первого платящего подписчика
- **-1%** за каждого последующего платящего подписчика

## Архитектура решения

### 1. Изменения в базе данных

**Новые колонки в таблице `profiles`:**
- `referral_code` (text, unique) - уникальный реферальный код пользователя
- `referred_by` (uuid) - ID пользователя, который пригласил (реферер)

**Новая таблица `referral_stats`:**
```
id (uuid, PK)
user_id (uuid, FK -> profiles) - владелец партнерской программы
referred_user_id (uuid) - привлеченный пользователь
first_payment_at (timestamp) - дата первого платежа
total_payments (integer) - количество платежей
is_paying (boolean) - совершил ли оплату
created_at (timestamp)
```

**RLS политики:**
- Пользователи могут видеть свою реферальную статистику
- Система может создавать/обновлять записи

### 2. Логика генерации реферального кода

При регистрации или первом входе в кабинет каждому пользователю генерируется уникальный код (8 символов: буквы + цифры).

Формат ссылки: `https://univer.lovable.app/?ref=XXXXXXXX`

### 3. Логика начисления скидок

**Расчет скидки:**
```
Количество платящих рефералов = N
Если N = 0: скидка = 0%
Если N = 1: скидка = 10%
Если N > 1: скидка = 10% + (N - 1) * 1%
Максимум: 50%
```

### 4. Изменения в UI (MyProfile.tsx)

Новый блок после секции тарифа:
- Заголовок с описанием программы
- Поле с реферальной ссылкой (копирование в буфер)
- Статистика: количество приглашенных, платящих, текущая скидка

### 5. Интеграция с платежами

**Модификация webhook (tribute-webhook):**
- При успешной оплате проверить, есть ли у пользователя `referred_by`
- Если есть, обновить `referral_stats` для реферера
- Отметить пользователя как платящего

**Модификация create-portal-payment:**
- При создании платежа получить скидку реферера
- Применить скидку к сумме платежа

---

## Технические детали

### Миграция базы данных

```sql
-- Добавить колонки в profiles
ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id);

-- Создать таблицу статистики рефералов
CREATE TABLE referral_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_paying boolean DEFAULT false,
  first_payment_at timestamptz,
  total_payments integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, referred_user_id)
);

-- Индексы
CREATE INDEX idx_referral_stats_user_id ON referral_stats(user_id);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);

-- RLS
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral stats"
  ON referral_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage referral stats"
  ON referral_stats FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role))
  WITH CHECK (true);
```

### Функция генерации реферального кода

```sql
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;
```

### Функция расчета скидки

```sql
CREATE OR REPLACE FUNCTION get_referral_discount(referrer_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  paying_count integer;
  discount numeric;
BEGIN
  SELECT COUNT(*) INTO paying_count
  FROM referral_stats
  WHERE user_id = referrer_id AND is_paying = true;

  IF paying_count = 0 THEN
    RETURN 0;
  ELSIF paying_count = 1 THEN
    RETURN 10;
  ELSE
    discount := 10 + (paying_count - 1);
    IF discount > 50 THEN
      discount := 50;
    END IF;
    RETURN discount;
  END IF;
END;
$$;
```

### Компонент ReferralBlock

Новый React-компонент для отображения партнерской программы:
- Показ реферальной ссылки с кнопкой копирования
- Статистика приглашенных пользователей
- Текущий процент скидки
- Описание программы

### Обработка реферального кода при регистрации

При переходе по реферальной ссылке код сохраняется в localStorage.
При регистрации код привязывается к новому пользователю.

---

## Файлы для изменения

1. **Миграция БД** - новая таблица и колонки
2. **src/pages/MyProfile.tsx** - добавить блок партнерской ссылки
3. **src/components/ReferralBlock.tsx** - новый компонент (создать)
4. **supabase/functions/tribute-webhook/index.ts** - учет реферальных платежей
5. **supabase/functions/create-portal-payment/index.ts** - применение скидки
6. **src/components/AuthModal.tsx** - обработка реферального кода при регистрации
