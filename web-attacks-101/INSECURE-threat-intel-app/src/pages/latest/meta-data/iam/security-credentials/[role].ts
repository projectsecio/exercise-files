import type { APIRoute } from "astro";
import { imdsCredentials } from "../../../../../lib/lab/ssrf";

export const prerender = false;

/**
 * Simulated cloud metadata service (IMDS-style).
 *
 * GET /latest/meta-data/iam/security-credentials/<role>
 * Returns temporary credentials for the named role — the SSRF "jackpot":
 * AccessKeyId / SecretAccessKey / Token that a real attacker would exfiltrate.
 */
export const GET: APIRoute = ({ params }) => {
  const role = params.role ?? "cti-uploader-role";
  return new Response(JSON.stringify(imdsCredentials(role), null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Server": "EC2ws",
      "X-Instance-Metadata": "v1",
    },
  });
};
