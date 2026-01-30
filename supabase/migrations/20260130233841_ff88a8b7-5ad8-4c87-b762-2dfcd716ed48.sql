-- Добавить insert политику для referral_stats (для триггера)
CREATE POLICY "System can insert referral stats via trigger"
  ON referral_stats FOR INSERT
  WITH CHECK (true);

-- Функция инкремента платежей реферала
CREATE OR REPLACE FUNCTION increment_referral_payment(referrer_id_param uuid, referred_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE referral_stats
  SET total_payments = COALESCE(total_payments, 0) + 1
  WHERE user_id = referrer_id_param 
    AND referred_user_id = referred_id_param
    AND first_payment_at IS NOT NULL;
END;
$$;