-- Restrict profile email visibility so it is never publicly readable

-- 1. Drop the existing SELECT policy that attempted to hide emails via email IS NULL
DROP POLICY IF EXISTS "Users view own profile with email, others without" ON public.profiles;

-- 2. Create a strict SELECT policy: only the profile owner and superusers can see any profile row
CREATE POLICY "Users and superusers view own profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR has_role(auth.uid(), 'superuser'::app_role)
);

-- Result:
-- - Regular users can only see their own profile (including their own email)
-- - Superusers can see all profiles (for administration)
-- - No other users can read any profile rows, so emails are not publicly visible
