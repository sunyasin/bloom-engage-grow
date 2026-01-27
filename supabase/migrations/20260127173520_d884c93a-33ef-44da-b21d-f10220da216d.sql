-- Create function to notify moderator about subscription tier changes
CREATE OR REPLACE FUNCTION public.notify_moderator_subscription_tier_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_name TEXT;
  v_creator_id UUID;
  v_moderator_id UUID;
  v_action TEXT;
  v_price_info TEXT;
  v_message TEXT;
BEGIN
  -- Get community info
  SELECT name, creator_id INTO v_community_name, v_creator_id
  FROM public.communities
  WHERE id = NEW.community_id;

  -- Find a moderator user
  SELECT user_id INTO v_moderator_id
  FROM public.user_roles
  WHERE role = 'superuser'
  LIMIT 1;

  -- If no moderator found, exit
  IF v_moderator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action := 'Добавлена';
  ELSE
    v_action := 'Изменена';
  END IF;

  -- Build price info
  v_price_info := COALESCE(NEW.price_monthly::TEXT, '0') || ' ' || NEW.currency || '/мес';
  IF NEW.price_yearly IS NOT NULL AND NEW.price_yearly > 0 THEN
    v_price_info := v_price_info || ', ' || NEW.price_yearly::TEXT || ' ' || NEW.currency || '/год';
  END IF;

  -- Build message
  v_message := v_action || ' подписка "' || NEW.name || '" в сообществе "' || COALESCE(v_community_name, 'Неизвестно') || '". ' || v_price_info || '. ' || TO_CHAR(NOW(), 'DD.MM.YYYY HH24:MI');

  -- Insert direct message from community creator to moderator
  INSERT INTO public.direct_messages (sender_id, recipient_id, content_text)
  VALUES (v_creator_id, v_moderator_id, v_message);

  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
CREATE TRIGGER trigger_notify_moderator_subscription_tier_insert
AFTER INSERT ON public.subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION public.notify_moderator_subscription_tier_change();

-- Create trigger for UPDATE (only when price/period changes)
CREATE OR REPLACE FUNCTION public.notify_moderator_subscription_tier_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_community_name TEXT;
  v_creator_id UUID;
  v_moderator_id UUID;
  v_price_info TEXT;
  v_message TEXT;
BEGIN
  -- Only proceed if price or currency changed
  IF OLD.price_monthly IS NOT DISTINCT FROM NEW.price_monthly 
     AND OLD.price_yearly IS NOT DISTINCT FROM NEW.price_yearly
     AND OLD.currency IS NOT DISTINCT FROM NEW.currency THEN
    RETURN NEW;
  END IF;

  -- Get community info
  SELECT name, creator_id INTO v_community_name, v_creator_id
  FROM public.communities
  WHERE id = NEW.community_id;

  -- Find a moderator user
  SELECT user_id INTO v_moderator_id
  FROM public.user_roles
  WHERE role = 'superuser'
  LIMIT 1;

  -- If no moderator found, exit
  IF v_moderator_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Build price info
  v_price_info := COALESCE(NEW.price_monthly::TEXT, '0') || ' ' || NEW.currency || '/мес';
  IF NEW.price_yearly IS NOT NULL AND NEW.price_yearly > 0 THEN
    v_price_info := v_price_info || ', ' || NEW.price_yearly::TEXT || ' ' || NEW.currency || '/год';
  END IF;

  -- Build message
  v_message := 'Изменена подписка "' || NEW.name || '" в сообществе "' || COALESCE(v_community_name, 'Неизвестно') || '". ' || v_price_info || '. ' || TO_CHAR(NOW(), 'DD.MM.YYYY HH24:MI');

  -- Insert direct message from community creator to moderator
  INSERT INTO public.direct_messages (sender_id, recipient_id, content_text)
  VALUES (v_creator_id, v_moderator_id, v_message);

  RETURN NEW;
END;
$$;

-- Create trigger for UPDATE
CREATE TRIGGER trigger_notify_moderator_subscription_tier_update
AFTER UPDATE ON public.subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION public.notify_moderator_subscription_tier_update();