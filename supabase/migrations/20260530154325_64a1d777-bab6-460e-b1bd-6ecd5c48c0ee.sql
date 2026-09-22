-- Demo user with full sample data
DO $$
DECLARE
  demo_user_id uuid := '11111111-1111-1111-1111-111111111111';
  svc_alongamento uuid := gen_random_uuid();
  svc_manutencao uuid := gen_random_uuid();
  svc_esmaltacao uuid := gen_random_uuid();
  svc_spa uuid := gen_random_uuid();
  svc_remocao uuid := gen_random_uuid();
BEGIN
  -- Create auth user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = demo_user_id) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      demo_user_id,
      'authenticated', 'authenticated',
      'demo@thaynails.local',
      crypt('demo123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false, '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), demo_user_id,
      jsonb_build_object('sub', demo_user_id::text, 'email', 'demo@thaynails.local'),
      'email', demo_user_id::text, now(), now(), now()
    );
  END IF;

  -- Tenant
  INSERT INTO public.tenants (owner_user_id, slug, business_name, active)
  VALUES (demo_user_id, 'demo', 'Studio Demo - NailControl', true)
  ON CONFLICT DO NOTHING;

  -- Role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (demo_user_id, 'tenant')
  ON CONFLICT DO NOTHING;

  -- Services
  INSERT INTO public.services (owner_id, name, description, price, duration) VALUES
    (demo_user_id, 'Alongamento em Fibra', 'Alongamento completo com fibra de vidro', 180.00, '2h30'),
    (demo_user_id, 'Manutenção', 'Manutenção de alongamento', 110.00, '1h30'),
    (demo_user_id, 'Esmaltação em Gel', 'Esmaltação em gel nas unhas naturais', 75.00, '1h'),
    (demo_user_id, 'Spa dos Pés', 'Tratamento completo para os pés', 95.00, '1h15'),
    (demo_user_id, 'Remoção', 'Remoção segura de alongamento', 50.00, '45min');

  -- Inventory
  INSERT INTO public.inventory (owner_id, item_name, category, stock_quantity, status) VALUES
    (demo_user_id, 'Gel Construtor Clear', 'Gel', 8, 'Normal'),
    (demo_user_id, 'Esmalte Vermelho Clássico', 'Esmalte', 3, 'Baixo'),
    (demo_user_id, 'Fibra de Vidro', 'Fibra', 12, 'Normal'),
    (demo_user_id, 'Top Coat', 'Finalizador', 1, 'Crítico'),
    (demo_user_id, 'Removedor de Cutícula', 'Acessório', 5, 'Baixo'),
    (demo_user_id, 'Lixa 100/180', 'Acessório', 25, 'Normal'),
    (demo_user_id, 'Primer', 'Preparação', 2, 'Baixo');

  -- Expenses
  INSERT INTO public.expenses (owner_id, description, category, amount, due_date, status) VALUES
    (demo_user_id, 'Aluguel do Studio', 'Fixo', 1800.00, CURRENT_DATE + 5, 'Pendente'),
    (demo_user_id, 'Energia Elétrica', 'Fixo', 220.00, CURRENT_DATE + 10, 'Pendente'),
    (demo_user_id, 'Compra de Materiais', 'Variável', 450.00, CURRENT_DATE - 3, 'Pago'),
    (demo_user_id, 'Internet', 'Fixo', 120.00, CURRENT_DATE + 15, 'Pendente'),
    (demo_user_id, 'Marketing Instagram', 'Marketing', 300.00, CURRENT_DATE - 10, 'Pago');

  -- Payments
  INSERT INTO public.payments (owner_id, payer_name, amount, method, payment_date, status) VALUES
    (demo_user_id, 'Mariana Silva', 180.00, 'PIX', CURRENT_DATE - 1, 'Pago'),
    (demo_user_id, 'Juliana Costa', 110.00, 'Cartão de Crédito', CURRENT_DATE - 2, 'Pago'),
    (demo_user_id, 'Beatriz Almeida', 75.00, 'Dinheiro', CURRENT_DATE, 'Pago'),
    (demo_user_id, 'Carolina Mendes', 180.00, 'PIX', CURRENT_DATE - 5, 'Pago'),
    (demo_user_id, 'Patrícia Lima', 95.00, 'Cartão de Débito', CURRENT_DATE - 7, 'Pago'),
    (demo_user_id, 'Renata Souza', 110.00, 'PIX', CURRENT_DATE + 3, 'Não Pago');

  -- Appointments: mix of past (Concluído) and future (Confirmado/Pendente)
  -- Get one real service id to link
  INSERT INTO public.appointments (owner_id, client_name, phone, service_id, appointment_time, status, price)
  SELECT demo_user_id, c.client_name, c.phone, s.id, c.dt, c.status, c.price
  FROM (VALUES
    ('Mariana Silva',    '11987654321', 'Alongamento em Fibra', (CURRENT_DATE - 1 + TIME '14:00')::timestamptz, 'Concluído', 180.00),
    ('Juliana Costa',    '11987651234', 'Manutenção',           (CURRENT_DATE - 2 + TIME '10:00')::timestamptz, 'Concluído', 110.00),
    ('Beatriz Almeida',  '11999887766', 'Esmaltação em Gel',    (CURRENT_DATE     + TIME '15:30')::timestamptz, 'Confirmado', 75.00),
    ('Carolina Mendes',  '11988776655', 'Alongamento em Fibra', (CURRENT_DATE - 5 + TIME '09:00')::timestamptz, 'Concluído', 180.00),
    ('Patrícia Lima',    '11977665544', 'Spa dos Pés',          (CURRENT_DATE - 7 + TIME '16:00')::timestamptz, 'Concluído', 95.00),
    ('Renata Souza',     '11966554433', 'Manutenção',           (CURRENT_DATE + 1 + TIME '11:00')::timestamptz, 'Confirmado', 110.00),
    ('Aline Pereira',    '11955443322', 'Esmaltação em Gel',    (CURRENT_DATE + 2 + TIME '14:00')::timestamptz, 'Pendente',   75.00),
    ('Fernanda Rocha',   '11944332211', 'Alongamento em Fibra', (CURRENT_DATE + 3 + TIME '09:30')::timestamptz, 'Confirmado',180.00),
    ('Camila Dias',      '11933221100', 'Spa dos Pés',          (CURRENT_DATE + 5 + TIME '16:30')::timestamptz, 'Pendente',   95.00),
    ('Mariana Silva',    '11987654321', 'Manutenção',           (CURRENT_DATE + 14+ TIME '14:00')::timestamptz, 'Pendente',  110.00)
  ) AS c(client_name, phone, svc_name, dt, status, price)
  JOIN public.services s ON s.owner_id = demo_user_id AND s.name = c.svc_name;
END $$;