
-- 1. App roles enum + user_roles table
CREATE TYPE public.app_role AS ENUM ('super_admin', 'tenant');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 2. Tenants table
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  business_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.tenants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants are publicly viewable" ON public.tenants
  FOR SELECT TO anon, authenticated USING (active = true OR owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Tenants can update own" ON public.tenants
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Seed: existing user becomes super_admin AND a tenant owning current data
INSERT INTO public.user_roles (user_id, role) VALUES
  ('3cd04e84-96cc-4a52-a613-6e3b7ff7d146', 'super_admin'),
  ('3cd04e84-96cc-4a52-a613-6e3b7ff7d146', 'tenant');

INSERT INTO public.tenants (owner_user_id, slug, business_name)
VALUES ('3cd04e84-96cc-4a52-a613-6e3b7ff7d146', 'thaynails', 'Thay Nails');

-- 4. Add owner_id to all data tables
ALTER TABLE public.appointments ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.services     ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.expenses     ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.inventory    ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.payments     ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settings     ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill existing rows to thaybarcellos
UPDATE public.appointments SET owner_id = '3cd04e84-96cc-4a52-a613-6e3b7ff7d146' WHERE owner_id IS NULL;
UPDATE public.services     SET owner_id = '3cd04e84-96cc-4a52-a613-6e3b7ff7d146' WHERE owner_id IS NULL;
UPDATE public.expenses     SET owner_id = '3cd04e84-96cc-4a52-a613-6e3b7ff7d146' WHERE owner_id IS NULL;
UPDATE public.inventory    SET owner_id = '3cd04e84-96cc-4a52-a613-6e3b7ff7d146' WHERE owner_id IS NULL;
UPDATE public.payments     SET owner_id = '3cd04e84-96cc-4a52-a613-6e3b7ff7d146' WHERE owner_id IS NULL;
UPDATE public.settings     SET owner_id = '3cd04e84-96cc-4a52-a613-6e3b7ff7d146' WHERE owner_id IS NULL;

ALTER TABLE public.appointments ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.services     ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.expenses     ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.inventory    ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.payments     ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.settings     ALTER COLUMN owner_id SET NOT NULL;

CREATE INDEX ON public.appointments(owner_id);
CREATE INDEX ON public.services(owner_id);
CREATE INDEX ON public.expenses(owner_id);
CREATE INDEX ON public.inventory(owner_id);
CREATE INDEX ON public.payments(owner_id);
CREATE INDEX ON public.settings(owner_id);

-- 5. Drop old permissive policies and create tenant-scoped ones

-- APPOINTMENTS
DROP POLICY IF EXISTS "Anyone can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated can view appointments" ON public.appointments;

CREATE POLICY "Public can book appointments" ON public.appointments
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.tenants t WHERE t.owner_user_id = appointments.owner_id AND t.active = true));
CREATE POLICY "Owner can view appointments" ON public.appointments
  FOR SELECT TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner can update appointments" ON public.appointments
  FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owner can delete appointments" ON public.appointments
  FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- SERVICES
DROP POLICY IF EXISTS "Authenticated users can manage services" ON public.services;
DROP POLICY IF EXISTS "Services are viewable by everyone" ON public.services;

CREATE POLICY "Services publicly viewable" ON public.services
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owner can manage services" ON public.services
  FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- EXPENSES
DROP POLICY IF EXISTS "Authenticated can manage expenses" ON public.expenses;
CREATE POLICY "Owner can manage expenses" ON public.expenses
  FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- INVENTORY
DROP POLICY IF EXISTS "Authenticated can manage inventory" ON public.inventory;
CREATE POLICY "Owner can manage inventory" ON public.inventory
  FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- PAYMENTS
DROP POLICY IF EXISTS "Authenticated can manage payments" ON public.payments;
CREATE POLICY "Owner can manage payments" ON public.payments
  FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- SETTINGS
DROP POLICY IF EXISTS "Authenticated can manage settings" ON public.settings;
CREATE POLICY "Owner can manage settings" ON public.settings
  FOR ALL TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
