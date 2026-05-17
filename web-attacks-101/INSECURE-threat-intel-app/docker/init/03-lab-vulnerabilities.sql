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

INSERT INTO dashboard.lab_products (name, description, price) VALUES
    ('Threat Intel Pro', 'Enterprise dashboard license', 499.00),
    ('Feed Parser Add-on', 'Lambda feed integration module', 129.00),
    ('GeoIP Layer', 'Country enrichment for IP panels', 79.00),
    ('SOC Playbook Pack', 'Incident response templates', 199.00);

INSERT INTO dashboard.lab_profiles (username, email, display_name, password) VALUES
    ('analyst', 'analyst@projectx.lab', 'Lab Analyst', 'analyst123'),
    ('bob', 'bob.secret@projectx.lab', 'Bob Victim', 'bobsecret')
ON CONFLICT (username) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    password = EXCLUDED.password;

INSERT INTO dashboard.lab_documents (id, owner_username, title, body, confidential) VALUES
    (1001, 'analyst', 'Analyst shift notes', 'Routine triage — no critical IOCs today.', false),
    (1002, 'bob', 'Q2 budget draft', 'CONFIDENTIAL: headcount and vendor spend projections.', true),
    (1003, 'bob', 'VPN credentials reset', 'Temporary VPN password: rotate-me-now (fictional lab data).', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE dashboard.lab_profiles ADD COLUMN IF NOT EXISTS password text;
UPDATE dashboard.lab_profiles SET password = 'analyst123' WHERE username = 'analyst' AND (password IS NULL OR password = '');
UPDATE dashboard.lab_profiles SET password = 'bobsecret' WHERE username = 'bob' AND (password IS NULL OR password = '');

SELECT setval(pg_get_serial_sequence('dashboard.lab_documents', 'id'), 2000);
