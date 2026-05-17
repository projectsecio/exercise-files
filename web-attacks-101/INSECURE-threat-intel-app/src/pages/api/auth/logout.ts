import type { APIRoute } from "astro";
import { clearSessionCookieHeader } from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": clearSessionCookieHeader(),
    },
  });
};
