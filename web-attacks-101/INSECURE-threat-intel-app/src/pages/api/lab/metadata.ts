import type { APIRoute } from "astro";
import { MOCK_METADATA } from "../../../lib/lab/ssrf";

export const prerender = false;

/** Simulated cloud metadata for SSRF lab (not real AWS). */
export const GET: APIRoute = () => {
  return new Response(JSON.stringify(MOCK_METADATA, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Lab-Metadata": "simulated-imds",
    },
  });
};
