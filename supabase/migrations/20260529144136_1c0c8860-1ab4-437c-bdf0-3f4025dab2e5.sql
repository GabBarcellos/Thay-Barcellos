-- Add public policies for expenses table (admin panel visibility)
CREATE POLICY "Anyone can view expenses"
ON public.expenses
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can manage expenses"
ON public.expenses
FOR ALL
TO public
USING (true)
WITH CHECK (true);