/** CTF-style messages shown when a WA101 lab vulnerability is successfully triggered. */
export const LAB_FLAGS = {
  sqli: "Found SQL Injection",
  xss: "Found Cross-Site Scripting",
  idor: "Found IDOR",
  csrf: "Found CSRF",
  ssrf: "Found SSRF",
  cmd: "Found Command Injection",
} as const;

export type LabFlagId = keyof typeof LAB_FLAGS;

const SQLI_INPUT = /'|--|#|\/\*|\bor\b|\bunion\b/i;

/** Catalog search: tautology-style injection returning the full product list (4 rows in lab seed). */
export function detectSqliSearch(
  query: string,
  productCount: number,
  catalogSize = 4
): boolean {
  if (!query.trim() || productCount < catalogSize) return false;
  return SQLI_INPUT.test(query);
}

/** App sign-in: login succeeds with SQL metacharacters in the username. */
export function detectSqliLogin(username: string, loggedIn: boolean): boolean {
  if (!loggedIn) return false;
  return SQLI_INPUT.test(username);
}

/** Stored XSS: unencoded HTML/JS in a collaboration comment. */
export function detectXssPayload(text: string): boolean {
  return (
    /<script\b/i.test(text) ||
    /<img\b[^>]*\bonerror\b/i.test(text) ||
    /<svg\b[^>]*\bonload\b/i.test(text) ||
    /javascript:/i.test(text) ||
    /on\w+\s*=/i.test(text)
  );
}

/** IDOR: signed-in user reads another user's confidential document. */
export function detectIdor(
  doc: { owner_username: string; confidential: boolean } | null,
  currentUsername: string
): boolean {
  if (!doc?.confidential) return false;
  return doc.owner_username !== currentUsername;
}

/** CSRF PoC or other forged notification email change. */
export function detectCsrfEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized === "attacker-forged@evil.lab" ||
    normalized.endsWith("@evil.lab")
  );
}

/** SSRF: internal metadata endpoint reached (simulated IMDS JSON). */
export function detectSsrfResponse(body: string): boolean {
  return (
    /AKIALABEXAMPLE/i.test(body) ||
    /iam\/security-credentials/i.test(body) ||
    /Simulated EC2 IMDS/i.test(body)
  );
}

/** Command injection: extra shell output (e.g. id) in the artifact integrity-check response. */
export function detectCommandInjection(output: string): boolean {
  return /\buid=\d+/.test(output) || /\bgid=\d+/.test(output) || /\bgroups=/.test(output);
}
