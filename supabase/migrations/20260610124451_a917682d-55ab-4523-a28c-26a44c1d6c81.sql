-- Fix search_path and execution permissions for sync_appointment_client
ALTER FUNCTION public.sync_appointment_client() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.sync_appointment_client() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_appointment_client() TO authenticated, service_role;
