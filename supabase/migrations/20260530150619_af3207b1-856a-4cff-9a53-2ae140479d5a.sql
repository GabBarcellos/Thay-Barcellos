-- Remove a constraint global antiga (key único globalmente quebra multi-tenant)
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_key_key;

-- Nova constraint correta: única por (owner_id, key)
ALTER TABLE public.settings ADD CONSTRAINT settings_owner_key_unique UNIQUE (owner_id, key);

-- Função para semear configurações padrão para cada novo tenant
CREATE OR REPLACE FUNCTION public.seed_tenant_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.settings (owner_id, key, value, description) VALUES
    (NEW.owner_user_id, 'daily_notifications_enabled', 'true', 'Notificações diárias ativas'),
    (NEW.owner_user_id, 'working_days', '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]', 'Dias de funcionamento'),
    (NEW.owner_user_id, 'salon_name', NEW.business_name, 'Nome do salão')
  ON CONFLICT (owner_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_defaults ON public.tenants;
CREATE TRIGGER trg_seed_tenant_defaults
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.seed_tenant_defaults();

-- Aplica defaults para tenants que já existem e ainda não têm essas chaves
INSERT INTO public.settings (owner_id, key, value, description)
SELECT t.owner_user_id, 'daily_notifications_enabled', 'true', 'Notificações diárias ativas'
FROM public.tenants t
ON CONFLICT (owner_id, key) DO NOTHING;

INSERT INTO public.settings (owner_id, key, value, description)
SELECT t.owner_user_id, 'working_days', '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]', 'Dias de funcionamento'
FROM public.tenants t
ON CONFLICT (owner_id, key) DO NOTHING;

INSERT INTO public.settings (owner_id, key, value, description)
SELECT t.owner_user_id, 'salon_name', t.business_name, 'Nome do salão'
FROM public.tenants t
ON CONFLICT (owner_id, key) DO NOTHING;