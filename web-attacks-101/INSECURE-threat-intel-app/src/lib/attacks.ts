/** WA101 web application attack scenarios (local Docker lab). */
export type AttackScenario = {
  slug: string;
  title: string;
  tactic: string;
  summary: string;
  /** Markdown file name under ATTACKS_GUIDES_DIR (docs/docs/wa101/attacks). */
  guideFile: string;
  /** Deliberately vulnerable lab page (requires dashboard login). */
  labPath: string;
};

export const ATTACK_SCENARIOS: AttackScenario[] = [
  {
    slug: "sql_injection",
    title: "SQL Injection (SQLi)",
    tactic: "Injection · OWASP A03",
    summary:
      "Untrusted input is concatenated into SQL queries, allowing data theft or authentication bypass.",
    guideFile: "sql_injection.md",
    labPath: "/lab/sql-injection",
  },
  {
    slug: "cross_site_scripting",
    title: "Cross-Site Scripting (XSS)",
    tactic: "Injection · OWASP A03",
    summary:
      "User-controlled output is rendered as HTML or script, enabling session theft or defacement.",
    guideFile: "cross_site_scripting.md",
    labPath: "/lab/cross-site-scripting",
  },
  {
    slug: "idor",
    title: "Insecure Direct Object Reference (IDOR)",
    tactic: "Broken Access Control · OWASP A01",
    summary:
      "Object identifiers in URLs or APIs are guessable with no authorization check on the server.",
    guideFile: "idor.md",
    labPath: "/lab/idor",
  },
  {
    slug: "csrf",
    title: "Cross-Site Request Forgery (CSRF)",
    tactic: "Session Management · OWASP A01",
    summary:
      "The browser sends authenticated requests the user did not intend, because anti-CSRF controls are missing.",
    guideFile: "csrf.md",
    labPath: "/lab/csrf",
  },
  {
    slug: "ssrf",
    title: "Server-Side Request Forgery (SSRF)",
    tactic: "SSRF · OWASP A10",
    summary:
      "The server fetches attacker-chosen URLs, reaching internal services or cloud metadata endpoints.",
    guideFile: "ssrf.md",
    labPath: "/lab/ssrf",
  },
  {
    slug: "command_injection",
    title: "Command Injection",
    tactic: "Injection · OWASP A03",
    summary:
      "User input is passed to a shell or system command, allowing arbitrary OS command execution.",
    guideFile: "command_injection.md",
    labPath: "/lab/command-injection",
  },
];
