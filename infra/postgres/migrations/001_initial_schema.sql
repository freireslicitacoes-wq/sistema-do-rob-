-- TikTok Auto Publisher AI — initial PostgreSQL schema
-- Apply with: psql "$DATABASE_URL" -f infra/postgres/migrations/001_initial_schema.sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'google_drive', 'authorized_url')),
  source_reference TEXT,
  original_name TEXT NOT NULL,
  storage_reference TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  duration_ms BIGINT CHECK (duration_ms IS NULL OR duration_ms >= 0),
  sha256 CHAR(64),
  natural_sort_number BIGINT CHECK (natural_sort_number IS NULL OR natural_sort_number >= 0),
  import_position BIGINT NOT NULL DEFAULT 0 CHECK (import_position >= 0),
  status TEXT NOT NULL DEFAULT 'imported'
    CHECK (status IN ('imported', 'validating', 'ready', 'invalid', 'archived')),
  validation_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_reference)
);

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_sha256_unique
  ON media_assets (sha256) WHERE sha256 IS NOT NULL;

CREATE INDEX IF NOT EXISTS media_assets_order_idx
  ON media_assets (natural_sort_number NULLS LAST, original_name, import_position);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('bulk_library', 'clips', 'live_monitor')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review_pending', 'approved', 'running', 'paused', 'completed', 'cancelled', 'failed')),
  daily_target INTEGER CHECK (daily_target IS NULL OR daily_target > 0),
  timezone TEXT NOT NULL DEFAULT 'America/Belem',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS publication_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  sequence_number BIGINT NOT NULL CHECK (sequence_number > 0),
  status TEXT NOT NULL DEFAULT 'imported'
    CHECK (status IN ('imported', 'processing', 'review_pending', 'approved', 'scheduled', 'uploading', 'published', 'rejected', 'failed', 'cancelled')),
  caption TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  consented_at TIMESTAMPTZ,
  approved_content_fingerprint CHAR(64),
  published_at TIMESTAMPTZ,
  platform_post_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, sequence_number),
  UNIQUE (campaign_id, media_asset_id),
  CHECK (status NOT IN ('approved', 'scheduled', 'uploading', 'published') OR
    (approved_at IS NOT NULL AND consented_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS publication_items_due_idx
  ON publication_items (scheduled_at, sequence_number)
  WHERE status = 'scheduled';

CREATE TABLE IF NOT EXISTS publication_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_item_id UUID NOT NULL REFERENCES publication_items(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'uncertain')),
  platform_request_id TEXT,
  response_summary JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS publication_attempts_item_idx
  ON publication_attempts (publication_item_id, started_at DESC);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON audit_events (entity_type, entity_id, created_at DESC);

COMMIT;
