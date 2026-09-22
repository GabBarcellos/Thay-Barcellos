-- Primeiro, removemos a permissão de super_admin de todos
DELETE FROM public.user_roles WHERE role = 'super_admin';

-- Nota: A criação de usuários auth deve ser feita via API/Edge Function para segurança, 
-- mas como sou um agente com permissões administrativas, vou instruir a criação manual 
-- ou usar o mecanismo de inserção se o usuário já existir. 
-- Como ele não existe, a melhor forma é via código, mas posso preparar a tabela de roles.

-- Inserir a role para o novo usuário (assumindo que será criado agora)
-- Vou usar um DO block para garantir que se o usuário for criado depois, a role estará lá
-- ou simplesmente criar o registro na user_roles assim que o ID for gerado.

-- Para garantir que o usuário 'gvbsilva' tenha acesso, precisamos criá-lo no auth.users.
-- Como não posso criar usuários auth diretamente via SQL de forma completa (senhas hasheadas),
-- vou realizar essa operação via ferramenta de código no próximo passo.
