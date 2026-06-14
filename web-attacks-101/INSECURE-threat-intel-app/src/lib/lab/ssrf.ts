/**
 * INTENTIONALLY VULNERABLE — extract external resource references from an uploaded
 * image so the "image processor" can resolve them server-side.
 *
 * Real renderers (ImageMagick/librsvg/etc.) follow `<image href>`, `<use href>`,
 * `xlink:href`, and CSS `url(...)` inside SVG/XML. Here we just scrape any http(s)
 * URL out of those attributes — which lets a crafted SVG steer the server's fetch
 * at internal hosts and cloud metadata (SSRF).
 */
export function extractImageExternalRefs(content: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /(?:xlink:href|href|src)\s*=\s*["']?(https?:\/\/[^"'>\s)]+)/gi,
    /url\(\s*["']?(https?:\/\/[^"')]+)/gi,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m[1]) refs.add(m[1]);
    }
  }
  return [...refs];
}

/** INTENTIONALLY VULNERABLE — server-side fetch of attacker-controlled URL (SSRF). */
export async function unsafeFetchUrl(url: string): Promise<{
  ok: boolean;
  status: number;
  contentType: string;
  body: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "INSECURE-threat-intel-lab/1.0" },
    });
    const contentType = res.headers.get("content-type") ?? "unknown";
    const body = (await res.text()).slice(0, 12000);
    return { ok: res.ok, status: res.status, contentType, body };
  } finally {
    clearTimeout(timeout);
  }
}

export const MOCK_METADATA = {
  note: "Simulated EC2 IMDS-style response for local SSRF lab",
  "iam/security-credentials/lab-role": {
    AccessKeyId: "AKIALABEXAMPLE",
    SecretAccessKey: "lab-secret-not-real",
    Token: "lab-session-token",
  },
};

/** Role name returned by the simulated IMDS credentials directory listing. */
export const IMDS_ROLE = "cti-uploader-role";

/** Simulated IMDS credentials document (the SSRF "jackpot" for the lab). */
export function imdsCredentials(role: string = IMDS_ROLE) {
  return {
    Code: "Success",
    LastUpdated: "2026-01-01T00:00:00Z",
    Type: "AWS-HMAC",
    Role: role,
    AccessKeyId: "AKIALABEXAMPLE",
    SecretAccessKey: "lab-secret-not-real-aws-key",
    Token: "lab-session-token-not-real",
    Expiration: "2026-12-31T23:59:59Z",
    note: "Simulated EC2 IMDS response for the local SSRF lab — not real credentials.",
  };
}
