BEGIN;
CREATE TABLE IF NOT EXISTS manager_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 run_type TEXT NOT NULL CHECK (run_type IN ('diagnostic','recovery_check')),
 status TEXT NOT NULL CHECK (status IN ('completed','partial','failed')),
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 finished_at TIMESTAMPTZ,
 alerts_scanned INTEGER NOT NULL DEFAULT 0,
 findings JSONB NOT NULL DEFAULT '[]'::jsonb,
 summary JSONB NOT NULL DEFAULT '{}'::jsonb,
 error_summary TEXT
);
CREATE INDEX IF NOT EXISTS manager_runs_started_idx ON manager_runs(started_at DESC);
COMMIT;
