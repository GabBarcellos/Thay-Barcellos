-- lovable-cron-fallback-reviewed: 288 runs/day; lembretes push em horários definidos pelo usuário (precisão de minutos) precisam ser enviados perto do horário marcado, com atraso máximo de 9 minutos
select cron.unschedule('push-reminders-5min') where exists (select 1 from cron.job where jobname='push-reminders-5min');

select cron.schedule(
  'push-reminders-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://project--7f876daf-ede7-45b7-a7bf-3e2070bc37d5.lovable.app/api/public/push/reminders',
    headers := jsonb_build_object('content-type','application/json','x-cron-secret','tn_push_cron_9f4c2a71b8e34d5c'),
    body := '{}'::jsonb
  );
  $$
);