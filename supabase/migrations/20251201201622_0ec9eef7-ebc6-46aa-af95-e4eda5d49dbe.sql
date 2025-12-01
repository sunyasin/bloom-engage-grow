-- Drop the current policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create restrictive policy: users can only see their own email, superusers see all
CREATE POLICY "Users view own profile with email, others without"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id THEN true
    WHEN has_role(auth.uid(), 'superuser'::app_role) THEN true
    ELSE (id IS NOT NULL AND email IS NULL)
  END
);

-- Note: This prevents email exposure while allowing profile visibility