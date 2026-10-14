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

// ── login screen (inlined: a relative import is not resolvable by Vercel's Node ESM loader) ──
// The login screen the server returns before any app byte is sent. Visually the
// same card the in-browser gate used to draw; the difference is that this one is
// served by middleware, so the prototype's JavaScript is never delivered until a
// valid session cookie exists.
const LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMTA0IiBhcmlhLWhpZGRlbj0idHJ1ZSI+CiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwxNykgc2NhbGUoMS4xMjgyKSI+CiAgICA8cGF0aCBkPSJNMCAwIEgyMCBMNDIgNjIgSDIyIFoiIGZpbGw9IiNmZmZmZmYiLz4KICAgIDxwYXRoIGQ9Ik0yNiA2MiBINDYgTDY0IDAgSDQ0IFoiIGZpbGw9IiMxZWE3NmEiLz4KICAgIDxwYXRoIGQ9Ik00MCAwIEg2MCBMODIgNjIgSDYyIFoiIGZpbGw9IiNmZmZmZmYiLz4KICAgIDxwYXRoIGQ9Ik02NiA2MiBIODYgTDEwNCAwIEg4NCBaIiBmaWxsPSIjMWVhNzZhIi8+CiAgPC9nPgogIDx0ZXh0IHg9IjE1MCIgeT0iNTIiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiBmb250LWZhbWlseT0iLWFwcGxlLXN5c3RlbSwgJ1NlZ29lIFVJJywgUm9ib3RvLCBIZWx2ZXRpY2EsIEFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iODAwIiBmb250LXNpemU9Ijc4IiBsZXR0ZXItc3BhY2luZz0iLTIiIGZpbGw9IiNmZmZmZmYiPndyYXBib3g8L3RleHQ+Cjwvc3ZnPgo=";
const GREEN = "#1ea76a";

function loginPage(opts: { next: string; failed: boolean; action: string }): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Wrapbox</title>
<style>
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{display:grid;place-items:center;background:radial-gradient(120% 130% at 50% -10%,#14231b 0%,#05070a 46%,#000 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}
@keyframes shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
@keyframes in{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
form{width:min(380px,calc(100vw - 40px));padding:36px 32px 30px;border-radius:16px;background:linear-gradient(180deg,#131417 0%,#0c0d0f 100%);border:1px solid rgba(255,255,255,.08);box-shadow:0 30px 80px -20px rgba(0,0,0,.6),0 1px 0 rgba(255,255,255,.05) inset;display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;animation:in .5s cubic-bezier(.2,.8,.2,1)}
form.shake{animation:shake .42s cubic-bezier(.36,.07,.19,.97)}
.chip{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;margin-bottom:18px;background:linear-gradient(160deg,${GREEN},#0f7a4a);box-shadow:0 8px 22px -8px ${GREEN}88,inset 0 1px 0 rgba(255,255,255,.25)}
.logo{height:22px;width:auto;display:block;margin-bottom:6px}
.t{font-size:15px;font-weight:600;color:#f2f3f4;margin-top:8px}
.s{font-size:13px;color:#8a8f98;line-height:1.5;margin:4px 0 22px;max-width:300px}
.f{position:relative;width:100%}
input{width:100%;height:44px;padding:0 42px 0 14px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);color:#f2f3f4;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s}
input:focus{border-color:${GREEN};box-shadow:0 0 0 3px ${GREEN}33}
.eye{position:absolute;right:4px;top:4px;width:36px;height:36px;display:grid;place-items:center;background:none;border:0;color:#62666d;cursor:pointer}.eye:hover{color:#e7e9ec}
.go{width:100%;height:44px;margin-top:12px;border-radius:9px;border:0;font-size:14px;font-weight:600;transition:filter .12s,transform .06s,background-color .15s,color .15s;background:rgba(255,255,255,.06);color:#62666d;cursor:default}
.go.on{background:${GREEN};color:#04170d;cursor:pointer}.go.on:hover{filter:brightness(1.08)}.go.on:active{transform:scale(.98)}
</style></head><body>
<form method="POST" action="${esc(opts.action)}" class="${opts.failed ? "shake" : ""}" autocomplete="off">
<input type="hidden" name="next" value="${esc(opts.next)}">
<div class="chip"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
<img class="logo" src="${LOGO}" alt="Wrapbox" width="135" height="22">
<div class="t">Wrapbox</div>
<div class="s">This preview is private. Enter the password to continue.</div>
<div class="f"><input id="p" name="password" type="password" placeholder="Password" autocomplete="off" spellcheck="false" autofocus required maxlength="256">
<button class="eye" type="button" id="e" aria-label="Show password"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M6.5 6.7C4 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.2M9.9 4.2A10.6 10.6 0 0 1 12 4c6.5 0 10 7 10 7a15.6 15.6 0 0 1-3.1 4"/></svg></button></div>
<button class="go" id="g" type="submit" disabled>Unlock</button>
</form>
<script>
var p=document.getElementById("p"),g=document.getElementById("g"),e=document.getElementById("e");
function u(){var on=p.value.length>0;g.disabled=!on;g.className="go"+(on?" on":"")}
p.addEventListener("input",u);e.addEventListener("click",function(){p.type=p.type==="password"?"text":"password"});u();
</script></body></html>`;
}

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
