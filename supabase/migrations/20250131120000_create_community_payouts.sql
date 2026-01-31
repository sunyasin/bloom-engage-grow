-- Создание таблицы community_payouts для учета выплат авторам сообщества

-- Создание таблицы community_payouts
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

-- Добавление связи payout_id в таблицу transactions
ALTER TABLE transactions ADD COLUMN payout_id UUID REFERENCES community_payouts(id) ON DELETE SET NULL;

-- Создание индексов для community_payouts
CREATE INDEX idx_payouts_author_id ON community_payouts(author_id);
CREATE INDEX idx_payouts_community_id ON community_payouts(community_id);
CREATE INDEX idx_payouts_created_at ON community_payouts(created_at);

-- Обновление индекса для transactions
CREATE INDEX idx_transactions_payout_id ON transactions(payout_id);

-- Создание RLS политик для community_payouts

-- Разрешаем чтение всем авторизованным пользователям
ALTER TABLE community_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON community_payouts
  FOR SELECT
  TO authenticated
  USING (true);

-- Разрешаем создание только авторизованным пользователям
CREATE POLICY "Enable insert for authenticated users" ON community_payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Разрешаем обновление только владельцам записи или суперпользователям
CREATE POLICY "Enable update for owners and superusers" ON community_payouts
  FOR UPDATE
  TO authenticated
  USING (
    author_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'superuser'
    )
  );
