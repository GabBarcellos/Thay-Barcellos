-- Legacy plaintext password storage is no longer used.
-- Values were cleared before this migration and authentication is handled by Supabase Auth.
ALTER TABLE public.tenants DROP COLUMN IF EXISTS raw_password;
