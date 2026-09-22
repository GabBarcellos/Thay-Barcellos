-- Fix function search path
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- The warning about USING (true) for SELECT is ignored by linter usually, 
-- but it complained about WITH CHECK (true) for INSERT on appointments.
-- We want anyone to create appointments, so this is intentional.
-- To satisfy the linter, we can add a dummy check or just leave it if it's really what we want.
-- Let's just fix the search path for now.
