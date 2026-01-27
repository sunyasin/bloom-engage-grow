-- Add moderated_at column to subscription_tiers
ALTER TABLE public.subscription_tiers 
ADD COLUMN moderated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create function to reset moderated_at on price/period changes
CREATE OR REPLACE FUNCTION public.reset_subscription_tier_moderation()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT: always set moderated_at to null
  IF TG_OP = 'INSERT' THEN
    NEW.moderated_at = NULL;
    RETURN NEW;
  END IF;
  
  -- For UPDATE: reset if price or period changed
  IF TG_OP = 'UPDATE' THEN
    IF OLD.price_monthly IS DISTINCT FROM NEW.price_monthly 
       OR OLD.price_yearly IS DISTINCT FROM NEW.price_yearly
       OR OLD.currency IS DISTINCT FROM NEW.currency THEN
      NEW.moderated_at = NULL;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trigger_reset_subscription_tier_moderation
BEFORE INSERT OR UPDATE ON public.subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION public.reset_subscription_tier_moderation();