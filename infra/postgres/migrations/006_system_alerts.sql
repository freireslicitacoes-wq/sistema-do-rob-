BEGIN;
CREATE TABLE IF NOT EXISTS system_alerts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 dedupe_key TEXT NOT NULL UNIQUE,
 alert_type TEXT NOT NULL,
 severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
 title TEXT NOT NULL,
 message TEXT NOT NULL,
 entity_type TEXT,
 entity_id UUID,
 status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved')),
 first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 acknowledged_at TIMESTAMPTZ,
 resolved_at TIMESTAMPTZ,
 occurrences INTEGER NOT NULL DEFAULT 1 CHECK (occurrences > 0),
 details JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS system_alerts_status_idx ON system_alerts(status,severity,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS system_alerts_type_idx ON system_alerts(alert_type,last_seen_at DESC);
COMMIT;
