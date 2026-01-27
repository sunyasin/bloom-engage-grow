-- Drop existing update trigger
DROP TRIGGER IF EXISTS trigger_notify_moderator_subscription_tier_update ON public.subscription_tiers;

-- Recreate trigger with WHEN condition to only fire on price/currency changes
CREATE TRIGGER trigger_notify_moderator_subscription_tier_update
AFTER UPDATE ON public.subscription_tiers
FOR EACH ROW
WHEN (
  OLD.price_monthly IS DISTINCT FROM NEW.price_monthly 
  OR OLD.price_yearly IS DISTINCT FROM NEW.price_yearly
  OR OLD.currency IS DISTINCT FROM NEW.currency
)
EXECUTE FUNCTION public.notify_moderator_subscription_tier_update();