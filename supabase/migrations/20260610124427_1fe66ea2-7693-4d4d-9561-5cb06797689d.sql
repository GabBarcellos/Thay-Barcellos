-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(phone, owner_id)
);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create Policy
CREATE POLICY "Users can manage their own clients" ON public.clients
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Add client_id to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Function to sync client data when an appointment is created
CREATE OR REPLACE FUNCTION public.sync_appointment_client() RETURNS TRIGGER AS $$
DECLARE
  v_client_id UUID;
BEGIN
  -- Check if client exists for this owner and phone
  SELECT id INTO v_client_id FROM public.clients 
  WHERE phone = NEW.phone AND owner_id = NEW.owner_id;

  IF v_client_id IS NULL THEN
    -- Create new client
    INSERT INTO public.clients (name, phone, owner_id)
    VALUES (NEW.client_name, NEW.phone, NEW.owner_id)
    RETURNING id INTO v_client_id;
  ELSE
    -- Update existing client name if it changed
    UPDATE public.clients SET name = NEW.client_name, updated_at = now()
    WHERE id = v_client_id;
  END IF;

  -- Update appointment with client_id
  NEW.client_id := v_client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run before insert on appointments
DROP TRIGGER IF EXISTS tr_sync_appointment_client ON public.appointments;
CREATE TRIGGER tr_sync_appointment_client
BEFORE INSERT OR UPDATE OF client_name, phone ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_client();

-- Populate clients from existing appointments
INSERT INTO public.clients (name, phone, owner_id)
SELECT DISTINCT ON (phone, owner_id) client_name, phone, owner_id 
FROM public.appointments
ON CONFLICT (phone, owner_id) DO UPDATE SET name = EXCLUDED.name;

-- Update existing appointments with client_ids
UPDATE public.appointments a
SET client_id = c.id
FROM public.clients c
WHERE a.phone = c.phone AND a.owner_id = c.owner_id;
