-- Local Docker only — matches production dashboard.panel_feed shape
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

-- Per-user lab notes for CA101-style attack scenarios
CREATE TABLE IF NOT EXISTS dashboard.attack_notes (
    id bigserial PRIMARY KEY,
    attack_slug text NOT NULL,
    username text NOT NULL,
    body text NOT NULL DEFAULT '',
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (attack_slug, username)
);
