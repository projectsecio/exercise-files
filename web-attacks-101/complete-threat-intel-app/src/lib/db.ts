import "dotenv/config";
import { Pool } from "pg";

function envString(name: string): string {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  const fromProcess =
    typeof process !== "undefined" ? process.env[name] : undefined;
  const value = fromMeta ?? fromProcess;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `${name} must be a non-empty string. Set it in the project root .env or the shell ` +
        `(e.g. export DB_PASSWORD=...). Missing values trigger SASL: "client password must be a string".`
    );
  }
  return value;
}

const pool = new Pool({
  host: envString("DB_HOST"),
  port: Number(
    (import.meta.env as Record<string, string | undefined>).DB_PORT ??
      (typeof process !== "undefined" ? process.env.DB_PORT : undefined) ??
      "5432"
  ),
  database: envString("DB_NAME"),
  user: envString("DB_USER"),
  password: envString("DB_PASSWORD"),
  ssl:
    ((import.meta.env as Record<string, string | undefined>).DB_SSLMODE ??
      (typeof process !== "undefined" ? process.env.DB_SSLMODE : undefined) ??
      "require") === "disable"
      ? false
      : { rejectUnauthorized: false },
});

export type NewsItem = {
  title?: string;
  url?: string;
  published?: string;
  summary?: string;
  /** Ranked / metric panels */
  count?: number;
  domain?: string;
  ip?: string;
  hash?: string;
  malware?: string;
  ioc_type?: string;
  ioc_value?: string;
  country_code?: string;
  country_name?: string;
  rank?: number;
};

export type PanelData = {
  panelName: string;
  sourceFeed: string;
  collectedAt: string | null;
  items: NewsItem[];
};

export async function getLatestSecurityNews(limit = 5): Promise<NewsItem[]> {
  const panel = await getLatestPanelData("security_news_rss", limit);
  return panel.items;
}

export async function getLatestPanelData(
  panelName: string,
  limit = 5
): Promise<PanelData> {
  const result = await pool.query(
    `SELECT source_feed, payload, collected_at
     FROM dashboard.panel_feed
     WHERE panel_name = $1
     ORDER BY collected_at DESC
     LIMIT 1`,
    [panelName]
  );

  if (result.rowCount === 0) {
    return {
      panelName,
      sourceFeed: "placeholder",
      collectedAt: null,
      items: [],
    };
  }

  const row = result.rows[0] ?? {};
  const payload = result.rows[0]?.payload ?? {};
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return {
    panelName,
    sourceFeed: row.source_feed ?? "placeholder",
    collectedAt: row.collected_at ? new Date(row.collected_at).toISOString() : null,
    items: items.slice(0, limit),
  };
}

const PANEL_LIMITS: { name: string; limit: number }[] = [
  { name: "security_news_rss", limit: 5 },
  { name: "top_100_domains", limit: 10 },
  { name: "top_ips", limit: 10 },
  { name: "top_10_countries_by_ip", limit: 10 },
  { name: "top_malware_hashes", limit: 25 },
  { name: "top_iocs", limit: 25 },
];

export async function getDashboardPanels(): Promise<PanelData[]> {
  return Promise.all(
    PANEL_LIMITS.map(({ name, limit }) => getLatestPanelData(name, limit))
  );
}
