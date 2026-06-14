/**
 * In-memory store for shared CTI (Cyber Threat Intelligence) reports.
 *
 * Reports are published to a team feed that every analyst can see. Each report
 * carries an "avatar" — a cover image uploaded as a file. The server "processes"
 * the uploaded image and resolves any external resources referenced *inside* it
 * (e.g. an SVG `<image href="…">`). That resolver is the INTENTIONALLY VULNERABLE
 * SSRF sink (see `unsafeFetchUrl` in ./ssrf): a crafted SVG can point the server
 * at internal/cloud-metadata URLs.
 *
 * The store is process-memory only; reports reset when the server restarts.
 */

export type CtiAvatar =
  | { kind: "none" }
  | {
      kind: "file";
      name: string;
      contentType: string;
      dataUrl: string;
    };

/** Result of the server resolving one external reference embedded in an upload. */
export type CtiExternalRef = {
  url: string;
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
};

export type CtiReport = {
  id: number;
  title: string;
  summary: string;
  author: string;
  createdAt: string;
  avatar: CtiAvatar;
  externalRefs: CtiExternalRef[];
};

const reports: CtiReport[] = [
  {
    id: 1,
    title: "APT-Seabird infrastructure refresh",
    summary:
      "New C2 domains rotated this week; see attached IOC table. Confidence: medium.",
    author: "lead-analyst",
    createdAt: "2026-01-04 09:12:00",
    avatar: { kind: "none" },
    externalRefs: [],
  },
  {
    id: 2,
    title: "Commodity loader campaign — invoice lures",
    summary:
      "Malspam delivering a JS loader via fake invoices. Hashes and sender domains below.",
    author: "shift-analyst",
    createdAt: "2026-01-05 14:48:00",
    avatar: { kind: "none" },
    externalRefs: [],
  },
];

let nextId = reports.length + 1;

/** Newest reports first. */
export function listReports(): CtiReport[] {
  return [...reports].sort((a, b) => b.id - a.id);
}

export function addReport(input: {
  title: string;
  summary: string;
  author: string;
  avatar: CtiAvatar;
  externalRefs?: CtiExternalRef[];
}): CtiReport {
  const report: CtiReport = {
    id: nextId++,
    title: input.title,
    summary: input.summary,
    author: input.author,
    createdAt: new Date().toISOString().replace("T", " ").slice(0, 19),
    avatar: input.avatar,
    externalRefs: input.externalRefs ?? [],
  };
  reports.push(report);
  return report;
}
