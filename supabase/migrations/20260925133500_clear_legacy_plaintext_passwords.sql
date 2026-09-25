-- Passwords are managed exclusively by Supabase Auth.
-- Keep the legacy column temporarily for schema compatibility, but remove any
-- stored plaintext values before the column is retired in a later migration.
UPDATE public.tenants
SET raw_password = NULL
WHERE raw_password IS NOT NULL;
