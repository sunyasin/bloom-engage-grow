-- Add sbp_phone column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sbp_phone text;