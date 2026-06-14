-- INSECURE-threat-intel-app — local Docker only
CREATE SCHEMA IF NOT EXISTS dashboard;

CREATE TABLE IF NOT EXISTS dashboard.panel_feed (
    id bigserial PRIMARY KEY,
    panel_name text NOT NULL,
    source_feed text NOT NULL,
    payload jsonb NOT NULL,
    collected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_panel_feed_name_collected
    ON dashboard.panel_feed (panel_name, collected_at DESC);
