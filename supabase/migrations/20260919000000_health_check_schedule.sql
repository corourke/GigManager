-- Daily health-check scheduling (issue #52 phase 2) — first use of pg_cron,
-- pg_net, and Vault-backed auth in this repo.
--
-- The bearer token and the edge-function URL are deliberately NOT set here:
-- a value baked into a migration file would leak into git history and would
-- also differ between dev and prod. Instead this schedules a job that reads
-- both from Supabase Vault at call time. One-time setup per project (see
-- docs/technical/deployment.md):
--
--   select vault.create_secret('<random-token>', 'health_check_cron_secret', 'Bearer token the daily health-check cron sends to the edge function');
--   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/server/internal/health-check', 'health_check_function_url', 'URL the daily health-check cron calls');
--   supabase secrets set HEALTH_CHECK_CRON_SECRET=<the same random token>
--
-- Until that setup is done, the job runs but the request 401s (no secrets to
-- read) — it does not fail the migration or block deploys.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'daily-health-check',
  '0 13 * * *', -- 13:00 UTC daily, per issue #52's confirmed once-a-day cadence
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'health_check_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'health_check_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
