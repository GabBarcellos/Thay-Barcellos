-- Harden external backup execution log access.
-- The backup endpoint uses the server-side service role; browser roles must not
-- be able to write, delete, truncate, or modify execution history.
REVOKE ALL ON TABLE public.external_backup_runs FROM anon;
REVOKE ALL ON TABLE public.external_backup_runs FROM authenticated;

GRANT SELECT ON TABLE public.external_backup_runs TO authenticated;

ALTER TABLE public.external_backup_runs ENABLE ROW LEVEL SECURITY;
