
-- Extend tenant seeding: when a new tenant is created, also seed default
-- services and inventory items so the booking page isn't empty.
-- Owner can edit/delete freely afterwards.

CREATE OR REPLACE FUNCTION public.seed_tenant_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Default settings
  INSERT INTO public.settings (owner_id, key, value, description) VALUES
    (NEW.owner_user_id, 'daily_notifications_enabled', 'true', 'Notificações diárias ativas'),
    (NEW.owner_user_id, 'working_days', '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]', 'Dias de funcionamento'),
    (NEW.owner_user_id, 'salon_name', NEW.business_name, 'Nome do salão')
  ON CONFLICT (owner_id, key) DO NOTHING;

  -- Default services (only if owner has none yet)
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE owner_id = NEW.owner_user_id) THEN
    INSERT INTO public.services (owner_id, name, price, duration, description) VALUES
      (NEW.owner_user_id, 'Alongamento em Fibra', 180, '2h 30min', 'Alongamento de unhas com fibra de vidro, acabamento natural e duradouro.'),
      (NEW.owner_user_id, 'Manutenção de Alongamento', 110, '1h 30min', 'Manutenção das unhas alongadas com troca de cor.'),
      (NEW.owner_user_id, 'Esmaltação em Gel', 75, '1h', 'Esmaltação em gel com alta durabilidade e brilho.'),
      (NEW.owner_user_id, 'Spa dos Pés', 95, '1h 15min', 'Cuidado completo dos pés com hidratação profunda.'),
      (NEW.owner_user_id, 'Manicure Tradicional', 50, '45min', 'Manicure clássica com esmaltação comum.');
  END IF;

  -- Default inventory (only if owner has none yet)
  IF NOT EXISTS (SELECT 1 FROM public.inventory WHERE owner_id = NEW.owner_user_id) THEN
    INSERT INTO public.inventory (owner_id, item_name, category, stock_quantity, status) VALUES
      (NEW.owner_user_id, 'Gel Construtor Clear', 'Gel', 5, 'Normal'),
      (NEW.owner_user_id, 'Top Coat', 'Acabamento', 3, 'Normal'),
      (NEW.owner_user_id, 'Lixa 100/180', 'Acessórios', 20, 'Normal'),
      (NEW.owner_user_id, 'Primer', 'Preparação', 4, 'Normal');
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: seed defaults for any existing tenant that has no services yet
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT owner_user_id, business_name FROM public.tenants LOOP
    IF NOT EXISTS (SELECT 1 FROM public.services WHERE owner_id = t.owner_user_id) THEN
      INSERT INTO public.services (owner_id, name, price, duration, description) VALUES
        (t.owner_user_id, 'Alongamento em Fibra', 180, '2h 30min', 'Alongamento de unhas com fibra de vidro, acabamento natural e duradouro.'),
        (t.owner_user_id, 'Manutenção de Alongamento', 110, '1h 30min', 'Manutenção das unhas alongadas com troca de cor.'),
        (t.owner_user_id, 'Esmaltação em Gel', 75, '1h', 'Esmaltação em gel com alta durabilidade e brilho.'),
        (t.owner_user_id, 'Spa dos Pés', 95, '1h 15min', 'Cuidado completo dos pés com hidratação profunda.'),
        (t.owner_user_id, 'Manicure Tradicional', 50, '45min', 'Manicure clássica com esmaltação comum.');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.inventory WHERE owner_id = t.owner_user_id) THEN
      INSERT INTO public.inventory (owner_id, item_name, category, stock_quantity, status) VALUES
        (t.owner_user_id, 'Gel Construtor Clear', 'Gel', 5, 'Normal'),
        (t.owner_user_id, 'Top Coat', 'Acabamento', 3, 'Normal'),
        (t.owner_user_id, 'Lixa 100/180', 'Acessórios', 20, 'Normal'),
        (t.owner_user_id, 'Primer', 'Preparação', 4, 'Normal');
    END IF;
  END LOOP;
END $$;
