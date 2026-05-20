import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "insecure_ti_session";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type SessionPayload = {
  username: string;
  exp: number;
};

function authSecret(): string {
  const s =
    (import.meta.env.AUTH_SECRET as string | undefined) ??
    (typeof process !== "undefined" ? process.env.AUTH_SECRET : undefined);
  if (!s) throw new Error("AUTH_SECRET is required");
  return s;
}

export function authCredentials(): { username: string; password: string } {
  const username =
    (import.meta.env.AUTH_USERNAME as string | undefined) ??
    process.env.AUTH_USERNAME ??
    "analyst";
  const password =
    (import.meta.env.AUTH_PASSWORD as string | undefined) ??
    process.env.AUTH_PASSWORD ??
    "projectx";
  return { username, password };
}

function sign(data: string): string {
  return createHmac("sha256", authSecret()).update(data).digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    username,
    exp: Date.now() + SESSION_MAX_AGE_MS,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;
  const expected = sign(data);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!payload.username || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request): SessionPayload | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return verifySessionToken(match?.[1] ? decodeURIComponent(match[1]) : undefined);
}

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/api/internal/metadata") return true;
  if (pathname === "/email-update.html") return true;
  if (pathname.startsWith("/_astro/")) return true;
  if (pathname.startsWith("/favicon")) return true;
  return false;
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
