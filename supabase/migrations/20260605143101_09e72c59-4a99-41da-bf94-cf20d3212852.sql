-- Verificando se a coluna já existe antes de tentar adicionar (embora em migrações controladas o erro falharia o deploy, é bom ser defensivo)
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS value_json JSONB;

-- Como o sistema atual usa uma coluna 'value' de tipo TEXT, vamos manter o padrão ou converter se necessário.
-- Mas para 'closed_slots' que é um dado estruturado, JSONB é melhor.
-- No entanto, o código atual lê da coluna 'value'. Vamos adicionar uma entrada na tabela de settings com a chave 'closed_slots'.
-- Não precisamos de alteração de schema se usarmos a coluna 'value' existente, mas JSONB seria ideal.
-- Vamos checar o tipo da coluna 'value' na tabela settings.
