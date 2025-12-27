-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Community owners and superusers can update communities" ON public.communities;

-- Create a new PERMISSIVE UPDATE policy
CREATE POLICY "Community owners and superusers can update communities" 
ON public.communities 
FOR UPDATE 
TO authenticated
USING ((creator_id = auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role))
WITH CHECK ((creator_id = auth.uid()) OR has_role(auth.uid(), 'superuser'::app_role));