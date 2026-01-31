# Проектирование таблицы выплат авторам сообщества

## Обзор

Создание таблицы `community_payouts` для учета выплат авторам сообщества заработанных средств от подписок.

## Предлагаемая структура таблицы

```prisma
// Добавить в prisma/schema.prisma

model community_payouts {
  id                  String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // Автор выплаты
  author_id           String              @db.Uuid

  // Сообщество, за которое начислена выплата
  community_id        String              @db.Uuid

  // Период, за который начислена выплата
  period_start        DateTime            @db.Timestamptz
  period_end          DateTime            @db.Timestamptz

  // Сумма выплаты
  amount              Decimal             @db.Decimal(10, 2)
  currency            String              @default("RUB")

  // Способ выплаты (банковская карта, YooKassa, криптовалюта и т.д.)
  payout_method       String?

  // Реквизиты/кошелек для выплаты (маскированные или хешированные)
  payout_details      Json?

  // Bucket для хранения квитанции
  receipt_bucket      String?             @default("payout-receipts")

  // Путь к файлу квитанции в storage
  receipt_path        String?

  // Комментарий администратора
  admin_comment       String?

  // Метаданные
  metadata            Json?

  // Timestamps
  created_at          DateTime            @default(now()) @db.Timestamptz(6)
  updated_at          DateTime            @default(now()) @db.Timestamptz(6)
  paid_at             DateTime?           @db.Timestamptz(6)

  // Отношения
  community           communities         @relation(fields: [community_id], references: [id], onDelete: Cascade)

  // Связанные транзакции
  transactions        transactions[]

  @@index([author_id], map: "idx_payouts_author_id")
  @@index([community_id], map: "idx_payouts_community_id")
  @@index([created_at], map: "idx_payouts_created_at")
  @@map("community_payouts")
  @@schema("public")
}
```

## Изменения в модели transactions

Добавить связь на выплаты:

```prisma
model transactions {
  // ... существующие поля ...

  // Новая связь
  payout_id            String?             @db.Uuid
  payout               community_payouts?  @relation(fields: [payout_id], references: [id], onDelete: SetNull)

  // ... существующие индексы ...
  @@index([payout_id], map: "idx_transactions_payout_id")
}
```

## Описание полей

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `id` | UUID | Да | Первичный ключ |
| `author_id` | UUID | Да | ID пользователя-автора |
| `community_id` | UUID | Да | ID сообщества |
| `period_start` | Timestamp | Да | Начало отчетного периода |
| `period_end` | Timestamp | Да | Конец отчетного периода |
| `amount` | Decimal | Да | Сумма выплаты |
| `currency` | String | Нет | Валюта (по умолчанию RUB) |
| `payout_method` | String | Нет | Способ получения выплаты |
| `payout_details` | JSON | Нет | Реквизиты (маскированные) |
| `receipt_bucket` | String | Нет | Bucket для хранения квитанции |
| `receipt_path` | String | Нет | Путь к файлу квитанции |
| `admin_comment` | String | Нет | Комментарий админа |
| `metadata` | JSON | Нет | Дополнительные данные |
| `created_at` | Timestamp | Да | Дата создания записи |
| `updated_at` | Timestamp | Да | Дата последнего обновления |
| `paid_at` | Timestamp | Нет | Дата фактической выплаты |

## Пример SQL миграции

```sql
CREATE TABLE community_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  payout_method VARCHAR,
  payout_details JSONB,
  receipt_bucket VARCHAR DEFAULT 'payout-receipts',
  receipt_path TEXT,
  admin_comment TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE transactions ADD COLUMN payout_id UUID REFERENCES community_payouts(id) ON DELETE SET NULL;

CREATE INDEX idx_payouts_author_id ON community_payouts(author_id);
CREATE INDEX idx_payouts_community_id ON community_payouts(community_id);
CREATE INDEX idx_payouts_created_at ON community_payouts(created_at);
CREATE INDEX idx_transactions_payout_id ON transactions(payout_id);
```

## Supabase Storage

Для квитанций создать bucket `payout-receipts` с политиками:
- Администраторы: полный доступ
- Авторы: чтение своих квитанций
