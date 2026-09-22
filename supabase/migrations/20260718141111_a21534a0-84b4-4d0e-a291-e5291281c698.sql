DROP POLICY IF EXISTS "Public can view closed_slots" ON public.settings;
CREATE POLICY "Public can view booking settings" ON public.settings
FOR SELECT TO anon
USING (key IN ('closed_slots', 'closed_slots_recurring', 'working_hours_start', 'working_hours_end', 'working_days', 'closed_dates'));