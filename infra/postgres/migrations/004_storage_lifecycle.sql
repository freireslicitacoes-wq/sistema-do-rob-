-- Storage lifecycle foundation. This migration does not delete files.
BEGIN;

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS storage_state TEXT NOT NULL DEFAULT 'active'
    CHECK (storage_state IN ('active', 'deletion_pending', 'deleted', 'needs_attention')),
  ADD COLUMN IF NOT EXISTS preserve_storage BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_last_error TEXT;

CREATE INDEX IF NOT EXISTS media_assets_retention_idx
  ON media_assets (delete_after, id)
  WHERE storage_state = 'active'
    AND preserve_storage = FALSE
    AND delete_after IS NOT NULL;

CREATE TABLE IF NOT EXISTS storage_policies (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  retention_hours INTEGER NOT NULL DEFAULT 72 CHECK (retention_hours BETWEEN 1 AND 8760),
  high_watermark_percent INTEGER NOT NULL DEFAULT 85 CHECK (high_watermark_percent BETWEEN 50 AND 99),
  resume_watermark_percent INTEGER NOT NULL DEFAULT 70 CHECK (resume_watermark_percent BETWEEN 10 AND 90),
  min_free_bytes BIGINT NOT NULL DEFAULT 1073741824 CHECK (min_free_bytes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (resume_watermark_percent < high_watermark_percent)
);

INSERT INTO storage_policies (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
