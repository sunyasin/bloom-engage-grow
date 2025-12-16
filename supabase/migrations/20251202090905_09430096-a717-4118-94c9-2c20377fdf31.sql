-- Create a security definer function that returns only safe profile fields
-- This bypasses RLS to provide public access to non-sensitive profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE (
  id uuid,
  real_name text,
  avatar_url text,
  rating integer,
  level integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    real_name,
    avatar_url,
    rating,
    level
  FROM public.profiles
  WHERE profiles.id = profile_id;
$$;

-- Create a function to get multiple public profiles (useful for batch queries)
CREATE OR REPLACE FUNCTION public.get_public_profiles(profile_ids uuid[])
RETURNS TABLE (
  id uuid,
  real_name text,
  avatar_url text,
  rating integer,
  level integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    real_name,
    avatar_url,
    rating,
    level
  FROM public.profiles
  WHERE profiles.id = ANY(profile_ids);
$$;

-- Result:
-- - Functions bypass RLS to return only safe profile fields
-- - Email, city, state, about_me, and payplan remain private
-- - Can be called by anyone to get public profile information
