-- Revoke public execution rights from security definer functions
REVOKE EXECUTE ON FUNCTION public.seed_tenant_defaults() FROM public;
REVOKE EXECUTE ON FUNCTION public.seed_tenant_defaults() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_tenant_defaults() FROM authenticated;

-- Ensure handle_updated_at is also restricted if it was flagged (best practice)
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated;
