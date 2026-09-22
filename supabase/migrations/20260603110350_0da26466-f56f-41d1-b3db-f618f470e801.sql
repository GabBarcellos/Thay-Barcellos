-- Add display_name column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Refresh the grants to ensure the new column is accessible
GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
