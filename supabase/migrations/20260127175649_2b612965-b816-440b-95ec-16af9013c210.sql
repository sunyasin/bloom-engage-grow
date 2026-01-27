-- Create RLS policy for moderators to update subscription_tiers (moderated_at and payment_url only)
CREATE POLICY "Moderators can update subscription tiers moderation"
ON public.subscription_tiers
FOR UPDATE
USING (
  has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Allow moderators to view all subscription tiers (not just active ones)
CREATE POLICY "Moderators can view all subscription tiers"
ON public.subscription_tiers
FOR SELECT
USING (
  has_role(auth.uid(), 'superuser'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);