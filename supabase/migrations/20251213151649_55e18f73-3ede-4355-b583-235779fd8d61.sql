-- Update RLS policy to allow any authenticated user to create communities
DROP POLICY IF EXISTS "Authors and superusers can create communities" ON public.communities;

CREATE POLICY "Authenticated users can create communities" 
ON public.communities 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);