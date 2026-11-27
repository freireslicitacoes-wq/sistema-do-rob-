BEGIN;
CREATE TABLE IF NOT EXISTS clip_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 source_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
 status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','review_pending','completed','failed','cancelled','needs_attention')),
 primary_engine TEXT NOT NULL DEFAULT 'chopify',
 fallback_engine TEXT NOT NULL DEFAULT 'peakcut',
 active_engine TEXT,
 max_clips INTEGER NOT NULL DEFAULT 5 CHECK (max_clips BETWEEN 1 AND 50),
 min_score NUMERIC(3,1) NOT NULL DEFAULT 8.0 CHECK (min_score BETWEEN 0 AND 10),
 options JSONB NOT NULL DEFAULT '{}'::jsonb,
 result_summary JSONB,
 last_error TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 started_at TIMESTAMPTZ,
 finished_at TIMESTAMPTZ,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clip_jobs_queue_idx ON clip_jobs (created_at,id) WHERE status='queued';
CREATE INDEX IF NOT EXISTS clip_jobs_asset_idx ON clip_jobs (source_asset_id,created_at DESC);
CREATE TABLE IF NOT EXISTS clip_job_attempts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 clip_job_id UUID NOT NULL REFERENCES clip_jobs(id) ON DELETE RESTRICT,
 engine_name TEXT NOT NULL,
 attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
 status TEXT NOT NULL CHECK (status IN ('started','succeeded','failed','timed_out','unavailable')),
 error_code TEXT,
 error_summary TEXT,
 output_manifest JSONB,
 started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 finished_at TIMESTAMPTZ,
 UNIQUE (clip_job_id,engine_name,attempt_number)
);
CREATE INDEX IF NOT EXISTS clip_job_attempts_job_idx ON clip_job_attempts (clip_job_id,started_at);
COMMIT;
