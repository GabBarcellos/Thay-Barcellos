ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS raw_password TEXT;

-- Popular dados existentes se possível (extraindo do email se houver padrão)
-- Mas como não temos acesso fácil ao auth.users via SQL aqui para atualização em massa de forma segura, 
-- deixaremos para atualizar conforme o uso ou via script se necessário.
-- No entanto, podemos tentar um palpite se o owner_id for conhecido.
UPDATE public.tenants SET username = 'thaybarcellos' WHERE slug = 'thaybarcellos';
