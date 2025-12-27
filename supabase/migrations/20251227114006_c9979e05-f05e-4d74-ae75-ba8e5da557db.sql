-- Drop the existing SELECT policies
DROP POLICY IF EXISTS "Users can view communities" ON public.communities;
DROP POLICY IF EXISTS "Anonymous can view public communities" ON public.communities;

-- Create a new PERMISSIVE SELECT policy that requires active subscription tiers for public visibility
CREATE POLICY "Users can view communities" 
ON public.communities 
FOR SELECT 
TO authenticated
USING (
  (creator_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_members.community_id = communities.id 
    AND community_members.user_id = auth.uid()
  )) OR 
  has_role(auth.uid(), 'superuser'::app_role) OR
  (visibility = 'public' AND EXISTS (
    SELECT 1 FROM subscription_tiers
    WHERE subscription_tiers.community_id = communities.id
    AND subscription_tiers.is_active = true
  ))
);

-- Also update anonymous policy to check for active subscription tiers
CREATE POLICY "Anonymous can view public communities" 
ON public.communities 
FOR SELECT 
TO anon
USING (
  visibility = 'public' AND EXISTS (
    SELECT 1 FROM subscription_tiers
    WHERE subscription_tiers.community_id = communities.id
    AND subscription_tiers.is_active = true
  )
);