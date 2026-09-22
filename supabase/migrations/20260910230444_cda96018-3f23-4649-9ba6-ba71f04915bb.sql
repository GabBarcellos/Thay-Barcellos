CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_owner_idx ON public.push_subscriptions(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "own push subscriptions" ON public.push_subscriptions FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.push_reminder_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reminder_key text not null,
  sent_at timestamptz not null default now(),
  unique (owner_id, reminder_key)
);
GRANT SELECT ON public.push_reminder_log TO authenticated;
GRANT ALL ON public.push_reminder_log TO service_role;
ALTER TABLE public.push_reminder_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own reminder log" ON public.push_reminder_log;
CREATE POLICY "own reminder log" ON public.push_reminder_log FOR SELECT TO authenticated
  USING (owner_id = auth.uid());