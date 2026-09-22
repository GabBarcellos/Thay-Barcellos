
-- Fix data leakage: scope public booking-page policies to the anon role only.
-- Authenticated users must only see their own rows via the owner policies.

-- appointments: "Public can view occupied slots" was qual=true for all roles
DROP POLICY IF EXISTS "Public can view occupied slots" ON public.appointments;
CREATE POLICY "Public can view occupied slots"
  ON public.appointments
  FOR SELECT
  TO anon
  USING (true);

-- services: "Services publicly viewable" was qual=true for all roles
DROP POLICY IF EXISTS "Services publicly viewable" ON public.services;
CREATE POLICY "Services publicly viewable"
  ON public.services
  FOR SELECT
  TO anon
  USING (true);

-- settings: closed_slots only needed publicly for the booking page
DROP POLICY IF EXISTS "Public can view closed_slots" ON public.settings;
CREATE POLICY "Public can view closed_slots"
  ON public.settings
  FOR SELECT
  TO anon
  USING (key = 'closed_slots');

-- appointments INSERT for public booking: also scope to anon
DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;
CREATE POLICY "Public can book appointments"
  ON public.appointments
  FOR INSERT
  TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.owner_user_id = appointments.owner_id AND t.active = true
  ));

-- Authenticated users can also INSERT their own appointments (owner self-create)
CREATE POLICY "Owner can insert appointments"
  ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- tenants: "Tenants are publicly viewable" exposed all active tenants to authenticated users too.
-- Booking page (anon) needs lookup by slug; authenticated users should only see their own tenant
-- (or all if super_admin, already handled by separate policy).
DROP POLICY IF EXISTS "Tenants are publicly viewable" ON public.tenants;
CREATE POLICY "Public can view active tenants"
  ON public.tenants
  FOR SELECT
  TO anon
  USING (active = true);
CREATE POLICY "Owner can view own tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
