-- Fix permission issue with has_role function for authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;

-- Update settings policy to avoid function overhead where possible
DROP POLICY IF EXISTS "Owner can manage settings" ON public.settings;
CREATE POLICY "Owner can manage settings" ON public.settings
FOR ALL USING (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Update tenants policies
DROP POLICY IF EXISTS "Tenants are publicly viewable" ON public.tenants;
CREATE POLICY "Tenants are publicly viewable" ON public.tenants
FOR SELECT USING (
  active = true 
  OR owner_user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admin manages tenants" ON public.tenants;
CREATE POLICY "Super admin manages tenants" ON public.tenants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);
