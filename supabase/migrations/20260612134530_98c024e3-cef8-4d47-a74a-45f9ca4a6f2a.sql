CREATE POLICY "Public can view closed_slots" ON public.settings FOR SELECT TO anon, authenticated USING (key = 'closed_slots');
GRANT SELECT ON public.settings TO anon;