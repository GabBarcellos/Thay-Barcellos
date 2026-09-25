-- has_role is used by authenticated RLS policies. It must not be callable by
-- unauthenticated API clients because its boolean result can be used as a role oracle.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
