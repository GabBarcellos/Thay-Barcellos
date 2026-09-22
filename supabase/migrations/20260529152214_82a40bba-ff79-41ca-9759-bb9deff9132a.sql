
-- Remove old admin user
DELETE FROM auth.users WHERE email = 'admin@thaynails.com';

-- Remove any existing thaybarcellos to avoid conflict
DELETE FROM auth.users WHERE email = 'thaybarcellos@thaynails.local';

-- Create new admin user with username-style email
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'thaybarcellos@thaynails.local',
  crypt('13406141978', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"],"username":"thaybarcellos"}'::jsonb,
  '{"username":"thaybarcellos"}'::jsonb,
  '', '', '', ''
);
