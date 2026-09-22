CREATE OR REPLACE FUNCTION public.sync_appointment_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id UUID;
  v_digits TEXT;
BEGIN
  v_digits := regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g');

  IF v_digits = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_client_id
  FROM public.clients
  WHERE owner_id = NEW.owner_id
    AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_digits
  LIMIT 1;

  IF v_client_id IS NULL THEN
    BEGIN
      INSERT INTO public.clients (name, phone, owner_id)
      VALUES (COALESCE(NULLIF(TRIM(NEW.client_name), ''), 'Cliente'), NEW.phone, NEW.owner_id)
      RETURNING id INTO v_client_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_client_id
      FROM public.clients
      WHERE owner_id = NEW.owner_id
        AND regexp_replace(COALESCE(phone, ''), '\D', '', 'g') = v_digits
      LIMIT 1;
    END;
  ELSIF NULLIF(TRIM(NEW.client_name), '') IS NOT NULL THEN
    UPDATE public.clients
    SET name = TRIM(NEW.client_name), updated_at = now()
    WHERE id = v_client_id;
  END IF;

  NEW.client_id := v_client_id;
  RETURN NEW;
END;
$function$;