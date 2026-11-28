BEGIN;
CREATE TABLE IF NOT EXISTS clip_engine_registry (
 engine_name TEXT PRIMARY KEY,
 role TEXT NOT NULL CHECK (role IN ('primary','reserve')),
 repository_url TEXT NOT NULL,
 license_id TEXT NOT NULL,
 validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending','validated','rejected')),
 enabled BOOLEAN NOT NULL DEFAULT false,
 validated_at TIMESTAMPTZ,
 validation_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
 last_validation_error TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (NOT enabled OR validation_status='validated')
);
INSERT INTO clip_engine_registry (engine_name,role,repository_url,license_id)
VALUES
 ('chopify','primary','https://github.com/mehbul/chopify','MIT'),
 ('peakcut','reserve','https://github.com/haziqahmedqasmi/PeakCut','MIT')
ON CONFLICT (engine_name) DO NOTHING;
CREATE INDEX IF NOT EXISTS clip_engine_registry_role_idx ON clip_engine_registry(role,enabled,validation_status);
COMMIT;
