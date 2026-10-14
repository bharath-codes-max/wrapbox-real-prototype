// Server-side password gate for the whole site (HTML, JS, CSS, decks, media).
//
// Why this exists: a password check that runs in the browser is not a gate —
// the app bundle, the expected hash and the unlock flag are all visible to the
// visitor. Here the check runs on Vercel *before* any file is returned, so an
// unauthenticated request receives only the login page (or a bare 401 for any
// non-page asset). Nothing of the prototype is delivered until the password is
// proven.
//
//   WRAPBOX_GATE_HASH    scrypt hash of the password   "s1$<salt b64>$<hash b64>"
//   WRAPBOX_GATE_SECRET  random HMAC key for the session cookie (>= 32 chars)
//
// Both live only in Vercel environment variables (never the repo or the bundle).
// If either is missing the gate fails CLOSED: 503, nothing served.
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { next } from "@vercel/functions";
import { loginPage } from "./gate/login-page";

export const config = { runtime: "nodejs" };

const COOKIE = "wb_gate";
const LOGIN_PATH = "/__wb_gate";
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

// Best-effort per-instance throttle. A random 24+ character password is what
// actually makes online guessing infeasible; this just slows casual hammering.
const fails = new Map<string, { n: number; until: number }>();
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

function env() {
  const hash = process.env.WRAPBOX_GATE_HASH ?? "";
  const secret = process.env.WRAPBOX_GATE_SECRET ?? "";
  return hash.startsWith("s1$") && secret.length >= 32 ? { hash, secret } : null;
}

const sign = (secret: string, exp: number) => createHmac("sha256", secret).update(`v1.${exp}`).digest("base64url");

export function makeSession(secret: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  return `v1.${exp}.${sign(secret, exp)}`;
}

export function validSession(secret: string, cookieHeader: string | null, now = Date.now()): boolean {
  const raw = (cookieHeader ?? "").split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const m = raw?.match(/^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp < Math.floor(now / 1000)) return false;
  const want = Buffer.from(sign(secret, exp));
  const got = Buffer.from(m[2]);
  return want.length === got.length && timingSafeEqual(want, got);
}

export function checkPassword(stored: string, attempt: string): boolean {
  const [, saltB64, hashB64] = stored.split("$");
  if (!saltB64 || !hashB64) return false;
  const want = Buffer.from(hashB64, "base64");
  const got = scryptSync(attempt.normalize("NFKC"), Buffer.from(saltB64, "base64"), want.length, SCRYPT);
  return got.length === want.length && timingSafeEqual(got, want);
}

// Only same-site relative paths — never an open redirect.
const safeNext = (v: string | null | undefined) => (v && /^\/(?![/\\])[^\r\n]*$/.test(v) ? v : "/");

const NO_STORE = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const html = (body: string, status: number, extra: Record<string, string> = {}) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE, ...extra } });

export default async function middleware(request: Request): Promise<Response> {
  const cfg = env();
  if (!cfg) return new Response("Preview gate is not configured.", { status: 503, headers: NO_STORE });

  const url = new URL(request.url);
  const ip = (request.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  if (url.pathname === LOGIN_PATH && request.method === "POST") {
    const slot = fails.get(ip);
    if (slot && slot.until > Date.now() && slot.n >= MAX_FAILS) {
      return new Response("Too many attempts. Try again later.", { status: 429, headers: { ...NO_STORE, "Retry-After": "900" } });
    }
    let password = "", nextPath = "/";
    try {
      const form = await request.formData();
      password = String(form.get("password") ?? "").slice(0, 256);
      nextPath = safeNext(String(form.get("next") ?? ""));
    } catch { /* malformed body → treated as a wrong password */ }
    if (password && checkPassword(cfg.hash, password)) {
      fails.delete(ip);
      const cookie = `${COOKIE}=${makeSession(cfg.secret)}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`;
      return new Response(null, { status: 303, headers: { Location: nextPath, "Set-Cookie": cookie, ...NO_STORE } });
    }
    const n = (slot && slot.until > Date.now() ? slot.n : 0) + 1;
    fails.set(ip, { n, until: Date.now() + FAIL_WINDOW_MS });
    await new Promise((r) => setTimeout(r, 800));
    return html(loginPage({ next: nextPath, failed: true, action: LOGIN_PATH }), 401);
  }

  if (validSession(cfg.secret, request.headers.get("cookie"))) {
    if (url.pathname === LOGIN_PATH) return new Response(null, { status: 303, headers: { Location: "/", ...NO_STORE } });
    return next();
  }

  // Unauthenticated: a page navigation gets the login screen, anything else a bare 401.
  const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) return html(loginPage({ next: safeNext(url.pathname + url.search), failed: false, action: LOGIN_PATH }), 401);
  return new Response("Unauthorized", { status: 401, headers: NO_STORE });
}
