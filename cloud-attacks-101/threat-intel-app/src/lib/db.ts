import { Pool } from "pg";

const pool = new Pool({
  host: import.meta.env.DB_HOST,
  port: Number(import.meta.env.DB_PORT ?? "5432"),
  database: import.meta.env.DB_NAME,
  user: import.meta.env.DB_USER,
  password: import.meta.env.DB_PASSWORD,
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
