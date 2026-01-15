-- Function to increment user rating
CREATE OR REPLACE FUNCTION public.increment_rating(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET rating = COALESCE(rating, 0) + 1,
      updated_at = now()
  WHERE id = user_id_param;
END;
$$;

-- Function to decrement user rating
CREATE OR REPLACE FUNCTION public.decrement_rating(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET rating = GREATEST(COALESCE(rating, 0) - 1, 0),
      updated_at = now()
  WHERE id = user_id_param;
END;
$$;