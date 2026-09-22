CREATE OR REPLACE FUNCTION public.seed_tenant_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Default settings (Essential for app operation)
  INSERT INTO public.settings (owner_id, key, value, description) VALUES
    (NEW.owner_user_id, 'daily_notifications_enabled', 'true', 'Notificações diárias ativas'),
    (NEW.owner_user_id, 'working_days', '["Segunda","Terça","Quarta","Quinta","Sexta","Sábado"]', 'Dias de funcionamento'),
    (NEW.owner_user_id, 'salon_name', NEW.business_name, 'Nome do salão')
  ON CONFLICT (owner_id, key) DO NOTHING;

  -- REMOVED: Default services and inventory seeding to allow "Clean Start"
  -- Professionals will now start with a clean workspace as requested.

  RETURN NEW;
END;
$$;

-- No backfill for existing users to avoid injecting unwanted sample data
-- Existing users who already have data will keep it.
