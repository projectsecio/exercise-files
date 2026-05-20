import type { APIRoute } from "astro";
import { MOCK_METADATA } from "../../../lib/lab/ssrf";

export const prerender = false;

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(MOCK_METADATA, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Instance-Metadata": "v1",
    },
  });
};
