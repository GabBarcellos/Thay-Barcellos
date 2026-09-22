-- Add subscription validity for tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Ensure only gvbsilva keeps super_admin role
DELETE FROM public.user_roles
WHERE role = 'super_admin'
  AND user_id NOT IN (
    SELECT owner_user_id FROM public.tenants WHERE username = 'gvbsilva'
  );