-- Create services table
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    service_id UUID REFERENCES public.services(id),
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Confirmado, Concluído, Cancelado
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    category TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Normal', -- Normal, Baixo, Crítico
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    category TEXT,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pendente', -- Pendente, Pago
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payer_name TEXT NOT NULL,
    method TEXT, -- Pix, Cartão, Dinheiro, Transferência
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Não Pago', -- Pago, Não Pago, Promessa
    promise_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT, INSERT ON public.appointments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;

GRANT ALL ON public.services TO service_role;
GRANT ALL ON public.appointments TO service_role;
GRANT ALL ON public.inventory TO service_role;
GRANT ALL ON public.expenses TO service_role;
GRANT ALL ON public.payments TO service_role;

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for services
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage services" ON public.services FOR ALL USING (auth.role() = 'authenticated');

-- Policies for appointments
CREATE POLICY "Authenticated users can manage appointments" ON public.appointments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can create appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view their own appointments by name" ON public.appointments FOR SELECT USING (true); -- simplified for now

-- Policies for others (admin only)
CREATE POLICY "Authenticated users can manage inventory" ON public.inventory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage expenses" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can manage payments" ON public.payments FOR ALL USING (auth.role() = 'authenticated');

-- Function and trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_inventory BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_expenses BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_payments BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed initial data
INSERT INTO public.services (name, image_url, description, price, duration) VALUES
('Unha de Gel', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&q=80&w=800', 'Durabilidade e brilho intenso com acabamento natural.', 120, '90 min'),
('Alongamento', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800', 'Unhas longas e resistentes com técnica avançada.', 180, '120 min'),
('Manicure Tradicional', 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=800', 'Cuidado clássico com cutilagem e esmaltação perfeita.', 45, '45 min');
