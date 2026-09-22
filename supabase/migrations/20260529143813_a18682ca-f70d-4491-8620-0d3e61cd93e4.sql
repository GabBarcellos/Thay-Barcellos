CREATE POLICY "Anyone can view inventory"
ON public.inventory
FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage inventory"
ON public.inventory
FOR ALL
USING (true)
WITH CHECK (true);