-- Finalize commercial pricing for SaaS plans.
-- Additive and safe: existing tenants/subscriptions are preserved.

alter table public.billing_plans
  add column if not exists annual_price_cents integer;

update public.billing_plans
set name = 'Standard', description = 'Agenda, clientes, serviços e controle financeiro para seu negócio.', monthly_price_cents = 2990, annual_price_cents = 24990, custom_domain = false, active = true, updated_at = now()
where code = 'standard';

update public.billing_plans
set name = 'Custom Domain', description = 'Tudo do Standard + domínio próprio para sua marca.', monthly_price_cents = 3990, annual_price_cents = 29990, custom_domain = true, active = true, updated_at = now()
where code = 'custom_domain';
