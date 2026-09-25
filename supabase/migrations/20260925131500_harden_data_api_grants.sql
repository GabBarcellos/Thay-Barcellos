-- Harden Data API grants: browser roles receive only operations covered by public RLS policies.
REVOKE ALL ON TABLE public.appointments, public.clients, public.expenses,
  public.external_backup_runs, public.inventory, public.payments,
  public.push_booking_events, public.push_reminder_log, public.push_subscriptions,
  public.services, public.settings, public.support_requests, public.tenants,
  public.user_roles, public.whatsapp_backgrounds
FROM anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.appointments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.expenses TO authenticated;
GRANT SELECT ON TABLE public.external_backup_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_booking_events, public.push_reminder_log, public.push_subscriptions TO authenticated;
GRANT SELECT ON TABLE public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.services TO authenticated;
GRANT SELECT ON TABLE public.settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.support_requests TO authenticated;
GRANT SELECT ON TABLE public.tenants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.whatsapp_backgrounds TO authenticated;
