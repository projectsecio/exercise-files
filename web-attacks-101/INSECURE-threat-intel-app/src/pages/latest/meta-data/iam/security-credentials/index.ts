import type { APIRoute } from "astro";
import { IMDS_ROLE } from "../../../../../lib/lab/ssrf";

export const prerender = false;

/**
 * Simulated cloud metadata service (IMDS-style).
 *
 * GET /latest/meta-data/iam/security-credentials/
 * Lists the IAM role(s) attached to the instance — the first hop an attacker
 * makes after reaching the metadata endpoint via SSRF.
 */
export const GET: APIRoute = () => {
  return new Response(`${IMDS_ROLE}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Server": "EC2ws",
      "X-Instance-Metadata": "v1",
    },
  });
};
