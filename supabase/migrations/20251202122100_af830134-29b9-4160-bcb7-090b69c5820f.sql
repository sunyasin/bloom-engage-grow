-- Drop the existing public SELECT policy on user_roles
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- Create a new SELECT policy that allows users to see only their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);