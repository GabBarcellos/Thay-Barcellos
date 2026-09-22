CREATE POLICY "Anyone can view payments"
ON public.payments
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage payments"
ON public.payments
FOR ALL
USING (true)
WITH CHECK (true);