
-- APPOINTMENTS: público pode INSERIR (booking), só authenticated lê/edita/apaga
DROP POLICY IF EXISTS "Anyone can view their own appointments by name" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can manage appointments" ON public.appointments;
-- mantém "Anyone can create appointments"

CREATE POLICY "Authenticated can view appointments"
  ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update appointments"
  ON public.appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete appointments"
  ON public.appointments FOR DELETE TO authenticated USING (true);

-- PAYMENTS
DROP POLICY IF EXISTS "Anyone can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON public.payments;
CREATE POLICY "Authenticated can manage payments"
  ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EXPENSES
DROP POLICY IF EXISTS "Anyone can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Anyone can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON public.expenses;
CREATE POLICY "Authenticated can manage expenses"
  ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INVENTORY
DROP POLICY IF EXISTS "Anyone can manage inventory" ON public.inventory;
DROP POLICY IF EXISTS "Anyone can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.inventory;
CREATE POLICY "Authenticated can manage inventory"
  ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- SETTINGS
DROP POLICY IF EXISTS "Anyone can manage settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.settings;
CREATE POLICY "Authenticated can manage settings"
  ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Revoga anon onde não é necessário
REVOKE SELECT, UPDATE, DELETE ON public.appointments FROM anon;
REVOKE ALL ON public.payments FROM anon;
REVOKE ALL ON public.expenses FROM anon;
REVOKE ALL ON public.inventory FROM anon;
REVOKE ALL ON public.settings FROM anon;
-- INSERT em appointments continua disponível para anon (booking público)
GRANT INSERT ON public.appointments TO anon;
