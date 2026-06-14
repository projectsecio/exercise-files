import type { APIRoute } from "astro";
import {
  createSessionToken,
  sessionCookieHeader,
} from "../../../lib/auth";
import { detectSqliLogin } from "../../../lib/lab/flags";
import { unsafeLabLogin } from "../../../lib/lab/sqli";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  const user = await unsafeLabLogin(username, password);
  if (!user) {
    return redirect("/login?error=1");
  }

  const token = createSessionToken(user.username);
  const location = detectSqliLogin(username, true) ? "/?sqli=1" : "/";
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
};
