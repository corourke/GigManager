-- Usage log for the ai-scan edge function, used for per-user rate limiting.
--
-- The ai-scan function (service role) counts a user's rows from the last hour
-- before each scan and rejects with 429 once the hourly limit is reached.
-- Rows older than 24 hours are opportunistically deleted by the function, so
-- this table stays small; it is not a long-term audit log.

CREATE TABLE public.ai_scan_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_scan_usage_user_time ON public.ai_scan_usage (user_id, created_at);

-- Service-role access only: RLS enabled with no policies means anon and
-- authenticated roles can neither read nor write; the edge function's
-- service-role client bypasses RLS.
ALTER TABLE public.ai_scan_usage ENABLE ROW LEVEL SECURITY;
