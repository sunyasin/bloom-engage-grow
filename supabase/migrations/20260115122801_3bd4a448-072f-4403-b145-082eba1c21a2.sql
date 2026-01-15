-- Drop existing policy
DROP POLICY IF EXISTS "Users can update own homework" ON public.homework_submissions;

-- Create updated policy that allows updating when status is 'ready' OR 'reject'
CREATE POLICY "Users can update own homework" 
ON public.homework_submissions 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  AND (status = 'ready' OR status = 'reject')
);