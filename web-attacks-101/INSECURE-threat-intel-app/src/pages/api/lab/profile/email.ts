import type { APIRoute } from "astro";
import { updateEmail } from "../../../../lib/lab/csrf";

export const prerender = false;

/** INTENTIONALLY VULNERABLE — no CSRF token; session cookie only. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const username = locals.username;
  if (!username) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let email = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { email?: string };
    email = String(body.email ?? "").trim();
  } else {
    const form = await request.formData();
    email = String(form.get("email") ?? "").trim();
  }

  if (!email) {
    return redirect("/lab/csrf?error=missing", 302);
  }

  await updateEmail(username, email);
  return redirect("/lab/csrf?updated=1", 302);
};
