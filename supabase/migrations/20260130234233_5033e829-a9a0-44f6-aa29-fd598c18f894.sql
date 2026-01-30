-- Обновить функцию расчета скидки: 10% за каждого платящего реферала, максимум 50%
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
  ELSE
    -- 10% за каждого платящего реферала, максимум 50%
    discount := paying_count * 10;
    IF discount > 50 THEN
      discount := 50;
    END IF;
    RETURN discount;
  END IF;
END;
$$;