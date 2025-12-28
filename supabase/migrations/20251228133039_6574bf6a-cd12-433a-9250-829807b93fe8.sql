-- Create a security definer function to check community ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_community_owner(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.communities
    WHERE id = _community_id
    AND (creator_id = _user_id OR has_role(_user_id, 'superuser'::app_role))
  )
$$;

-- Drop the existing subscription_tiers policy that causes recursion
DROP POLICY IF EXISTS "Community owners can manage subscription tiers" ON public.subscription_tiers;

-- Recreate policy using the security definer function
CREATE POLICY "Community owners can manage subscription tiers"
ON public.subscription_tiers
FOR ALL
TO authenticated
USING (public.is_community_owner(auth.uid(), community_id))
WITH CHECK (public.is_community_owner(auth.uid(), community_id));