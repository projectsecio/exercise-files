import type { APIRoute } from "astro";
import { ATTACK_SCENARIOS } from "../../../lib/attacks";
import { getAttackNote, saveAttackNote } from "../../../lib/notes";

export const prerender = false;

const slugs = new Set(ATTACK_SCENARIOS.map((a) => a.slug));

export const GET: APIRoute = async ({ url, locals }) => {
  const slug = url.searchParams.get("slug") ?? "";
  if (!slugs.has(slug)) {
    return new Response(JSON.stringify({ error: "Unknown attack" }), { status: 404 });
  }
  const note = await getAttackNote(slug, locals.username);
  return new Response(JSON.stringify(note), {
    headers: { "Content-Type": "application/json" },
  });
};

export const PUT: APIRoute = async ({ request, locals }) => {
  let body: { slug?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }
  const slug = body.slug ?? "";
  if (!slugs.has(slug)) {
    return new Response(JSON.stringify({ error: "Unknown attack" }), { status: 404 });
  }
  const updatedAt = await saveAttackNote(
    slug,
    locals.username,
    String(body.body ?? "")
  );
  return new Response(JSON.stringify({ ok: true, updatedAt }), {
    headers: { "Content-Type": "application/json" },
  });
};
