-- Billing foundation for SaaS subscriptions.
-- Additive only: existing tenants remain active and unchanged.
alter table public.tenants
  add column if not exists plan_code text,
  add column if not exists license_status text not null default 'active',
  add column if not exists license_valid_until timestamptz,
  add column if not exists billing_email text,
  add column if not exists mp_preapproval_id text;

create table if not exists public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  monthly_price_cents integer,
  currency text not null default 'BRL',
  custom_domain boolean not null default false,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid not null references public.billing_plans(id) on delete restrict,
  provider text not null default 'mercadopago',
  provider_subscription_id text unique,
  status text not null default 'pending',
  payer_email text,
  amount_cents integer not null,
  currency text not null default 'BRL',
  checkout_url text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_tenant_idx on public.billing_subscriptions(tenant_id);
create index if not exists billing_subscriptions_provider_idx on public.billing_subscriptions(provider_subscription_id);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  provider_event_id text,
  provider_resource_id text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists billing_events_provider_event_unique
  on public.billing_events(provider, provider_event_id)
  where provider_event_id is not null;

alter table public.billing_plans enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_events enable row level security;

revoke all on public.billing_plans, public.billing_subscriptions, public.billing_events from anon, authenticated;
grant select on public.billing_plans to anon, authenticated;

drop policy if exists billing_plans_public_read on public.billing_plans;
create policy billing_plans_public_read on public.billing_plans
for select to anon, authenticated
using (active = true);

-- Subscriptions/events are server-managed. No browser INSERT/UPDATE/DELETE.
