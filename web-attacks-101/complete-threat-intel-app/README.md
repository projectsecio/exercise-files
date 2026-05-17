# Web Threat Intelligence Dashboard

Astro SSR dashboard that reads the latest threat-intelligence panel snapshots from PostgreSQL (`dashboard.panel_feed`) and renders six panels: Security News RSS, Top Domains, Top IPs, Top 10 Countries by IP, Top Malware Hashes, and Top IOCs.

Built with **Astro 5**, **@astrojs/node** (standalone SSR), **React** (ECharts chart islands), **Tailwind CSS**, and **pg**.

---

## Prerequisites

- **Node.js 22** (matches `.github/workflows/deploy-ec2.yml` and recommended EC2 runtime)
- **PostgreSQL** with `dashboard.panel_feed` populated (CA101/WA101 Lambda ingest path)
- Panel data from **`public-threat-intelligence-feed-parser`** and optional **`private-db-threat-intelligence-feed-pull`**

---

## Quick start

```bash
npm install
# Create .env in the project root (see variables below)
npm run dev            # http://localhost:4321
```

Create a **`.env`** file in the project root (never commit it):

```env
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=your-database
DB_USER=your-user
DB_PASSWORD=your-password
DB_SSLMODE=require
```

| Variable | Purpose |
|----------|---------|
| `DB_HOST` | PostgreSQL hostname |
| `DB_PORT` | Port (default `5432`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_SSLMODE` | `require` (default) or `disable` for local/lab Postgres without TLS |

Production on EC2: the same `.env` lives next to the app (see `systemd/threat-intel-dashboard.service`). GitHub Actions deploy does **not** copy `.env`; configure it once on the server.

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server at `http://localhost:4321` |
| `npm run build` | Production build to `./dist/` |
| `npm run preview` | Preview the production build locally |

---

## Project structure

```text
complete-threat-intel-app/
├── .github/workflows/deploy-ec2.yml   # CI: build → rsync → restart systemd
├── src/
│   ├── pages/
│   │   ├── index.astro                # Main dashboard (panels, layout, colors)
│   │   ├── security-news.astro      # Standalone RSS test page
│   │   └── api/security-news.json.ts
│   ├── components/charts/           # React + ECharts (domains bar, countries map)
│   ├── lib/db.ts                      # Postgres queries + panel list/limits
│   └── styles/global.css              # Tailwind + scrollable feed utility
├── systemd/threat-intel-dashboard.service
├── astro.config.mjs
└── tailwind.config.js
```

**Data flow:** Lambda writes JSON to S3 → ingest Lambda upserts `dashboard.panel_feed` → `getDashboardPanels()` in `src/lib/db.ts` → `index.astro` renders each `panel_name`.

---

## Customize the color palette

The UI uses a **dark zinc base** with **sky** accents. Colors live in three places—update all of them if you want a cohesive rebrand.

### 1. Page shell and panels (`src/pages/index.astro`)

Tailwind utility classes control the background, cards, text, and links. Common tokens:

| Element | Example classes | Role |
|---------|-----------------|------|
| Page background | `bg-zinc-950`, radial gradient on `body` | Canvas |
| Cards | `border-white/[0.06]`, `bg-white/[0.02]` | Panel containers |
| Headings / body | `text-zinc-100`, `text-zinc-500` | Typography |
| Links & badges | `text-sky-400/90`, `hover:text-sky-300`, `border-sky-500/20`, `bg-sky-500/10` | Interactive accent |

**Example:** switch accents from sky to emerald—replace `sky-*` with `emerald-*` on links and count badges in `index.astro`.

### 2. Scrollable lists (`src/styles/global.css`)

The `.feed-scroll` utility sets scrollbar thumb/track colors (zinc palette). Adjust the `rgb(...)` values in `.feed-scroll` and `::-webkit-scrollbar-*` rules to match your theme.

### 3. ECharts charts (hex colors)

Chart colors are **not** controlled by Tailwind; edit the React chart components directly:

| File | What to change |
|------|----------------|
| `src/components/charts/DomainsBarChart.tsx` | Axis, grid, tooltip, bar gradient (`#0369a1` → `#38bdf8`), emphasis color |
| `src/components/charts/CountriesMapChart.tsx` | Tooltip, `visualMap.inRange.color` gradient, map `areaColor` / `borderColor`, emphasis |

Use a single accent family (e.g. replace sky hex values `#0ea5e9`, `#38bdf8`, `#7dd3fc` with your palette) so the map and bar chart match the Astro page.

### 4. Optional: extend Tailwind (`tailwind.config.js`)

To centralize colors, add theme extensions:

```js
theme: {
  extend: {
    colors: {
      brand: { DEFAULT: '#0ea5e9', muted: '#7dd3fc' },
    },
  },
},
```

Then use `text-brand`, `bg-brand/10`, etc. in `index.astro` instead of hard-coded `sky-*` classes.

---

## Customize the menu (navigation)

The default dashboard has a **title header only**—no top navigation. Add links in one of these ways:

### Option A — Header links on the main dashboard (simplest)

Edit the `<header>` block in `src/pages/index.astro` and add a `<nav>` next to the title:

```astro
<header class="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] pb-8">
  <div>
    <p class="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">Threat intelligence</p>
    <h1 class="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Dashboard</h1>
  </div>
  <nav class="flex flex-wrap gap-4 text-sm">
    <a class="text-zinc-400 transition-colors hover:text-sky-300" href="/">Dashboard</a>
    <a class="text-zinc-400 transition-colors hover:text-sky-300" href="https://github.com/YOUR_USERNAME" target="_blank" rel="noopener noreferrer">GitHub</a>
    <a class="text-zinc-400 transition-colors hover:text-sky-300" href="https://YOUR_BLOG.medium.com" target="_blank" rel="noopener noreferrer">Blog</a>
    <a class="text-zinc-400 transition-colors hover:text-sky-300" href="mailto:you@example.com">Contact</a>
  </nav>
</header>
```

Use your real URLs (Medium, Substack, GitHub profile, `mailto:`, or a contact page).

### Option B — Shared layout (multiple pages)

1. Create `src/layouts/DashboardLayout.astro` with `<html>`, `<head>`, global CSS import, and the shared `<nav>`.
2. Wrap page content:

```astro
---
import DashboardLayout from '../layouts/DashboardLayout.astro';
---
<DashboardLayout title="Threat intelligence · Dashboard">
  <!-- page-specific content -->
</DashboardLayout>
```

3. Use the same layout on `security-news.astro` so navigation is consistent.

For a full walkthrough (blog, GitHub, contact), see the WA101 course guide **Optional navigation menu** (`optional_menu.md` in the Finish Web Threat Intelligence Dashboard portfolio section).

---

## Add more dashboard panels

Each panel is identified by a **`panel_name`** string that must match across Lambda, Postgres, and this app.

### End-to-end checklist

| Step | Where | What to do |
|------|--------|------------|
| 1 | Lambda feed module | Add `your_panel_feed.py` and register `panel_key` in `PANEL_MODULES` (`lambda_function.py`) |
| 2 | S3 / ingest | Ensure ingest writes rows to `dashboard.panel_feed` with `panel_name = 'your_panel_key'` |
| 3 | `src/lib/db.ts` | Add `{ name: "your_panel_key", limit: N }` to `PANEL_LIMITS` |
| 4 | `src/pages/index.astro` | Add display title, grid class, sort order, and render branch |
| 5 | EventBridge (optional) | Schedule the new `panel_key` on your feed Lambda |

### 1. Register the panel in the database layer

In `src/lib/db.ts`, append to `PANEL_LIMITS`:

```ts
{ name: "your_panel_key", limit: 10 },
```

`getDashboardPanels()` will fetch the latest row for that `panel_name`. Extend `NewsItem` in the same file if your payload uses new fields (e.g. `cve_id`, `severity`).

### 2. Control order and grid size

In `src/pages/index.astro`:

- **`PANEL_DISPLAY_ORDER`** — array of `panel_name` values; defines left-to-right / top-to-bottom order on the dashboard.
- **`panelGridClass()`** — Tailwind column spans on the 6-column `xl` grid (e.g. `xl:col-span-3` for a half-width panel).
- **`panelTitles`** — human-readable heading for each `panel_name`.

### 3. Choose how to render the panel

Inside the `orderedPanels.map(...)` block, add a branch for your `panel.panelName`:

- **List / links** — copy the `top_ips` or `top_iocs` block (scrollable list when `panel.items.length > 10` via class `feed-scroll`).
- **RSS-style** — copy the `security_news_rss` block.
- **Chart** — add a React component under `src/components/charts/`, import it in `index.astro`, and use `<YourChart client:only="react" items={panel.items} />` (see `DomainsBarChart` and `CountriesMapChart`).

**Example** — simple list for a new panel key `my_custom_panel`:

```astro
) : panel.panelName === 'my_custom_panel' ? (
  <ul class="divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-black/20">
    {panel.items.map((item) => (
      <li class="px-3.5 py-2.5 text-sm text-zinc-200">{item.title ?? '—'}</li>
    ))}
  </ul>
) : (
```

Place this before the final `else` fallback branch.

### 4. Payload shape

Ingest stores JSON in `payload`. The app expects `payload.items` to be an array. Each item is a loose object; common fields used today:

| Field | Used by |
|-------|---------|
| `title`, `url`, `published` | RSS, generic lists |
| `count`, `domain` | Top domains, IPs |
| `hash`, `malware` | Malware hashes |
| `ioc_type`, `ioc_value` | IOCs |
| `country_code`, `country_name` | Countries map |

Match field names to what your Lambda module emits so templates and charts can read them.

### 5. Standalone page or API (optional)

- New route: `src/pages/my-panel.astro` calling `getLatestPanelData("your_panel_key", limit)`.
- JSON API: copy `src/pages/api/security-news.json.ts` and change the panel name.

---

## Deploy and operations

| Topic | Location |
|-------|----------|
| GitHub Actions CI/CD | `.github/workflows/deploy-ec2.yml` — push to `main` builds and rsyncs to EC2 |
| Process manager | `systemd/threat-intel-dashboard.service` — runs `node dist/server/entry.mjs` on port **4321** |
| Course deploy guide | WA101 **deploy** and **implement GitHub CI/CD** docs |

**Secrets for Actions:** `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `DEPLOY_PATH` (e.g. `/home/ubuntu/complete-threat-intelligence-dashboard`).

To serve on **port 80** without `:4321`, put **nginx** (or another reverse proxy) in front of the Node process—covered in the deploy guide.

---

## Related Lambda / panel keys

| `panel_name` / `panel_key` | Lambda module (exercise repo) |
|----------------------------|-------------------------------|
| `security_news_rss` | `rss_feed.py` |
| `top_100_domains` | `top_100_domains_feed.py` |
| `top_ips` | `top_ips_feed.py` |
| `top_10_countries_by_ip` | `top_10_countries_by_ip_feed.py` |
| `top_malware_hashes` | `top_malware_hashes_feed.py` |
| `top_iocs` | `top_iocs_feed.py` |

Feed source: `exercise-files/web-attacks-101/threat_intelligence_lambda_functions/public-threat-intelligence-feed-parser/`

---

## Learn more

- [Astro documentation](https://docs.astro.build)
- [ECharts option reference](https://echarts.apache.org/en/option.html)
- ProjectSecurity.io WA101 portfolio guides (panels, CI/CD, domain, deploy)
