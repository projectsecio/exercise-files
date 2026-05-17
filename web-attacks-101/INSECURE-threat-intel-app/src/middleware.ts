import { defineMiddleware } from "astro:middleware";
import { getSessionFromRequest, isPublicPath } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (isPublicPath(pathname)) {
    return next();
  }

  const session = getSessionFromRequest(context.request);
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect("/login");
  }

  context.locals.username = session.username;
  return next();
});
