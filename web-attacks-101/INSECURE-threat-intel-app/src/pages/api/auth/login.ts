import type { APIRoute } from "astro";
import {
  authCredentials,
  createSessionToken,
  sessionCookieHeader,
} from "../../../lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const { username: expectedUser, password: expectedPass } = authCredentials();

  if (username !== expectedUser || password !== expectedPass) {
    return redirect("/login?error=1");
  }

  const token = createSessionToken(username);
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": sessionCookieHeader(token),
    },
  });
};
