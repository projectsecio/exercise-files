import type { APIRoute } from "astro";
import { getLatestSecurityNews } from "../../lib/db";

export const GET: APIRoute = async () => {
  try {
    const items = await getLatestSecurityNews(5);
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        items: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
