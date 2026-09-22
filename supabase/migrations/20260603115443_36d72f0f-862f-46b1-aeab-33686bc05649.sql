-- Create backgrounds table
CREATE TABLE public.whatsapp_backgrounds (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID, -- Optional: links to a specific tenant if multi-tenancy is enforced by ID
    url TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.whatsapp_backgrounds ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_backgrounds TO authenticated;
GRANT ALL ON public.whatsapp_backgrounds TO service_role;

-- Policies
CREATE POLICY "Users can view their own backgrounds"
ON public.whatsapp_backgrounds FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backgrounds"
ON public.whatsapp_backgrounds FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backgrounds"
ON public.whatsapp_backgrounds FOR DELETE
USING (auth.uid() = user_id);
