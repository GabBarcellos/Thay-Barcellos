CREATE TABLE public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Admin only policies
CREATE POLICY "Authenticated users can manage settings" ON public.settings FOR ALL USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER set_updated_at_settings BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed initial settings
INSERT INTO public.settings (key, value, description) VALUES 
('whatsapp_number', '', 'Número do WhatsApp para receber notificações (DDI + DDD + Número)'),
('daily_notifications_enabled', 'true', 'Habilitar envio de resumo diário de agendamentos');
