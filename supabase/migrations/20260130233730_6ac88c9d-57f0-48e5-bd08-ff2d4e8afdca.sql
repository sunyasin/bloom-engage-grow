-- Добавить колонки в profiles
ALTER TABLE profiles ADD COLUMN referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN referred_by uuid REFERENCES profiles(id);

-- Индекс для реферального кода
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);

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

-- Индексы для referral_stats
CREATE INDEX idx_referral_stats_user_id ON referral_stats(user_id);
CREATE INDEX idx_referral_stats_referred_user_id ON referral_stats(referred_user_id);

-- RLS для referral_stats
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral stats"
  ON referral_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage referral stats"
  ON referral_stats FOR ALL
  USING (has_role(auth.uid(), 'superuser'::app_role));

-- Функция генерации реферального кода
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Функция расчета скидки реферера
CREATE OR REPLACE FUNCTION get_referral_discount(referrer_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Триггер для автогенерации реферального кода при создании профиля
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := generate_referral_code();
      SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- Функция для создания записи реферала при регистрации
CREATE OR REPLACE FUNCTION create_referral_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO referral_stats (user_id, referred_user_id)
    VALUES (NEW.referred_by, NEW.id)
    ON CONFLICT (user_id, referred_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_referral_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_on_signup();