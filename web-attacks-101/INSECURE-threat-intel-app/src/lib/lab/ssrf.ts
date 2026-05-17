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
