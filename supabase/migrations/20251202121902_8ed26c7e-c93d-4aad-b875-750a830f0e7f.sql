-- Drop the existing SELECT policy on profiles
DROP POLICY IF EXISTS "Users and superusers view own profiles" ON public.profiles;

-- Create a new SELECT policy that explicitly requires authentication
CREATE POLICY "Users and superusers view own profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR has_role(auth.uid(), 'superuser'::app_role));