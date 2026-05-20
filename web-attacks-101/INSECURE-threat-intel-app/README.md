# INSECURE Threat Intelligence App (local lab)

Local-only fork of the WA101 threat intelligence dashboard for **Docker** development:

- **Six synthetic feed panels** pre-seeded in PostgreSQL
- **Session auth** (username/password from environment)
- **Field notes** page to document assessment findings per attack type

> **Not for production.** Weak default credentials, no TLS, synthetic data. Production deployable app: **`complete-threat-intel-app`**.

## Quick start

```bash
cd exercise-files/web-attacks-101/INSECURE-threat-intel-app
npm run docker:up
```

Open **http://localhost:8080** → sign in:

| Field | Default |
|-------|---------|
| Username | `analyst` |
| Password | `projectx` |

## Application areas

Vulnerabilities are embedded in normal product features (no separate lab UI):

| Feature | Location |
|---------|----------|
| SQL injection | **Marketplace** — catalog search, partner sign-in |
| XSS | **Dashboard** — analyst collaboration thread |
| IDOR | **Documents** — reference `?id=` |
| CSRF | **Settings** — notification email update |
| SSRF | **Dashboard** — remote feed validation (`feed_url`) |
| Command injection | **Tools** — feed endpoint reachability check |

When you successfully exploit a vulnerability, a CTF-style banner appears at the top of the page (for example **Found SSRF**, **Found SQL Injection**).

Course methodology and walkthroughs: **`docs/docs/wa101/attacks/`** (hosted docs, not mounted in the app).

## Commands

| Command | Action |
|---------|--------|
| `npm run docker:up` | Build and start Postgres + app |
| `npm run docker:down` | Stop and remove volumes |

## Environment

| Variable | Docker default | Purpose |
|----------|----------------|---------|
| `AUTH_USERNAME` / `AUTH_PASSWORD` | `analyst` / `projectx` | Login |
| `AUTH_SECRET` | (see compose) | Session signing |
| `DB_*` | (see compose) | PostgreSQL |

## Related

- **Docker setup:** `docs/docs/wa101/infra/Insecure - Build Local Docker Container With The Following Attacks/docker_container_setup.md`
- **Burp basics:** `docs/docs/wa101/infra/Insecure - Build Local Docker Container With The Following Attacks/burp_suite_basics.md`
- Production dashboard: `../complete-threat-intel-app`
