-- Intentional WA101 lab tables (deliberately insecure — local Docker only)

CREATE TABLE IF NOT EXISTS dashboard.lab_products (
    id serial PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS dashboard.lab_comments (
    id serial PRIMARY KEY,
    author text NOT NULL DEFAULT 'guest',
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dashboard.lab_documents (
    id serial PRIMARY KEY,
    owner_username text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    confidential boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS dashboard.lab_profiles (
    username text PRIMARY KEY,
    email text NOT NULL,
    display_name text NOT NULL,
    password text NOT NULL
);

INSERT INTO dashboard.lab_comments (author, body) VALUES
    ('analyst', '<b>Case #4402</b><br>Phishing lure at projectx-secure[.]lab — blocked at mail gateway. Closed, no further action.'),
    ('analyst', '<b>Case #4418</b><br>Feed parser v2.4 prod deploy Sunday 02:00 UTC. Expect short GeoIP ingest gap.'),
    ('analyst', '<b>Case #4471</b><br>Lookalike login page reported. Callback: <code>203.0.113.44</code>. Escalated to tier 2.');

INSERT INTO dashboard.lab_products (name, description, price) VALUES
    ('Threat Intel Pro', 'Enterprise dashboard license', 499.00),
    ('Feed Parser Add-on', 'Lambda feed integration module', 129.00),
    ('GeoIP Layer', 'Country enrichment for IP panels', 79.00),
    ('SOC Playbook Pack', 'Incident response templates', 199.00);

INSERT INTO dashboard.lab_profiles (username, email, display_name, password) VALUES
    ('analyst', 'analyst@projectx.lab', 'Lab Analyst', 'projectx'),
    ('bob', 'bob.secret@projectx.lab', 'Bob Victim', 'bobsecret')
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    password = EXCLUDED.password;

-- Analyst's own notes (1001-1005) — these populate the "Recent" list, and the
-- analyst can post more from the Documents page (new notes get ids from 2001+).
-- Bob's sensitive record (1011) is the IDOR target: not listed in the UI,
-- reachable only by changing ?id= to that reference.
INSERT INTO dashboard.lab_documents (id, owner_username, title, body, confidential) VALUES
    (1001, 'analyst', 'Shift handover notes', 'Routine triage — no critical IOCs today. Day shift cleared the queue.', false),
    (1002, 'analyst', 'Triage queue summary', 'Reviewed 18 alerts; 2 escalated to tier 2, remainder closed as benign.', false),
    (1003, 'analyst', 'Phishing campaign IOCs', 'Lookalike domain projectx-secure[.]lab; blocked at mail gateway.', false),
    (1004, 'analyst', 'Endpoint isolation log', 'Host WS-2291 isolated for review; no lateral movement observed.', false),
    (1005, 'analyst', 'Weekly feed health check', 'All six intel feeds returning data; GeoIP layer slightly delayed.', false),
    (1011, 'bob', 'Q2 budget & VPN reset', 'SENSITIVE: headcount, vendor spend projections, and temporary VPN password rotate-me-now (fictional lab data).', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE dashboard.lab_profiles ADD COLUMN IF NOT EXISTS password text;
UPDATE dashboard.lab_profiles SET password = 'projectx' WHERE username = 'analyst' AND (password IS NULL OR password = '');
UPDATE dashboard.lab_profiles SET password = 'bobsecret' WHERE username = 'bob' AND (password IS NULL OR password = '');

SELECT setval(pg_get_serial_sequence('dashboard.lab_documents', 'id'), 2000);
