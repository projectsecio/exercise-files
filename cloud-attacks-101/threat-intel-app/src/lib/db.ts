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
    (import.meta.env.DB_SSLMODE ?? "require") === "disable"
      ? false
      : { rejectUnauthorized: false },
});

export type NewsItem = {
  title?: string;
  url?: string;
  published?: string;
  summary?: string;
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

export async function getDashboardPanels(): Promise<PanelData[]> {
  const panelNames = [
    "security_news_rss",
    "top_100_domains",
    "top_ips",
    "top_10_countries_by_ip",
    "top_malware_hashes",
    "top_iocs",
  ];

  return Promise.all(panelNames.map((panelName) => getLatestPanelData(panelName, 5)));
}
