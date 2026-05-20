import type { APIRoute } from "astro";
import { updateEmail } from "../../../lib/lab/csrf";

export const prerender = false;

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
    return redirect("/settings?error=missing", 302);
  }

  await updateEmail(username, email);
  return redirect("/settings?updated=1", 302);
};
