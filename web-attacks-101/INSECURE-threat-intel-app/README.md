# INSECURE Threat Intelligence App (local lab)

Local-only fork of the WA101 threat intelligence dashboard for **Docker** development:

- **Six synthetic feed panels** pre-seeded in PostgreSQL
- **Session auth** (username/password from environment)
- **Attacks** page for six **Web & Attacks 101** scenarios with **notes dialog**

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

## WA101 attack guides (source of truth)

Guides live in the **course docs**, not in this exercise folder:

```text
docs/docs/wa101/attacks/
├── sql_injection.md
├── cross_site_scripting.md
├── idor.md
├── csrf.md
├── ssrf.md
└── command_injection.md
```

Docker mounts that directory into the app at `/app/attack-guides`. In the UI: **Attacks** → **View guide**, or `/attacks/<slug>`.

| Slug | Attack |
|------|--------|
| `sql_injection` | SQL Injection (SQLi) |
| `cross_site_scripting` | Cross-Site Scripting (XSS) |
| `idor` | Insecure Direct Object Reference |
| `csrf` | Cross-Site Request Forgery (CSRF) |
| `ssrf` | Server-Side Request Forgery (SSRF) |
| `command_injection` | Command Injection |

## Architecture

```text
Browser :8080  →  Astro SSR  →  PostgreSQL
                      ↑
              docs/docs/wa101/attacks (mounted read-only)
```

## Commands

| Command | Action |
|---------|--------|
| `npm run docker:up` | Build and start Postgres + app (`docker-compose`) |
| `npm run docker:down` | Stop and remove volumes |

If you see `unknown shorthand flag: 'f'`, use **`docker-compose`** (hyphen), not `docker compose` — see the Docker setup guide.
| `npm run dev` | Local dev (set `.env` + `ATTACKS_GUIDES_DIR` to docs path) |

## Environment

| Variable | Docker default | Purpose |
|----------|----------------|---------|
| `ATTACKS_GUIDES_DIR` | `/app/attack-guides` | WA101 markdown guides |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | `analyst` / `projectx` | Login |
| `AUTH_SECRET` | (see compose) | Session signing |
| `DB_*` | (see compose) | PostgreSQL |

## Related

- **Docker setup guide:** `docs/docs/wa101/infra/Insecure - Build Local Docker Container With The Following Attacks/docker_container_setup.md`
- **Burp basics:** `docs/docs/wa101/infra/Insecure - Build Local Docker Container With The Following Attacks/burp_suite_basics.md`
- Attack guides: `docs/docs/wa101/attacks/`
- Production dashboard: `../complete-threat-intel-app`
