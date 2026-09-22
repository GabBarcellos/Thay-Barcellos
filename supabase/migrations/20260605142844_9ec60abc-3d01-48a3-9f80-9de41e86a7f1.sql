ALTER TABLE public.appointments ADD COLUMN observation TEXT;
ALTER TABLE public.appointments ADD COLUMN discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.appointments ADD COLUMN is_exchange BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN custom_price DECIMAL(10,2);