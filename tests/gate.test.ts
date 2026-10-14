import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";

const PASSWORD = "Correct-Horse-Battery-Staple-24x";
const salt = randomBytes(16);
const hash = scryptSync(PASSWORD.normalize("NFKC"), salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
process.env.WRAPBOX_GATE_HASH = `s1$${salt.toString("base64")}$${hash.toString("base64")}`;
process.env.WRAPBOX_GATE_SECRET = randomBytes(48).toString("base64url");

const { default: gate, makeSession, validSession } = await import("../middleware");
const SECRET = process.env.WRAPBOX_GATE_SECRET!;
const BASE = "https://wrapbox-real-prototype.vercel.app";
const page = (path = "/", cookie?: string) =>
  new Request(BASE + path, { headers: { accept: "text/html", ...(cookie ? { cookie } : {}) } });
const login = (password: string, next = "/") => {
  const body = new URLSearchParams({ password, next });
  return new Request(BASE + "/__wb_gate", { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "9.9.9.9" } });
};

test("unauthenticated page gets only the login screen — no app code", async () => {
  const res = await gate(page("/"));
  const text = await res.text();
  assert.equal(res.status, 401);
  assert.match(text, /Enter the password to continue/);
  assert.doesNotMatch(text, /assets\/main-/);
  assert.equal(res.headers.get("cache-control"), "no-store");
});

test("unauthenticated asset / api / decks get a bare 401", async () => {
  for (const p of ["/assets/main-CnGZUK1l.js", "/portfolio.html?x=1"]) {
    const res = await gate(new Request(BASE + p, { headers: { accept: "*/*" } }));
    assert.equal(res.status, 401);
    assert.equal(await res.text(), "Unauthorized");
  }
});

test("old client-side bypasses do nothing (localStorage flag, old password)", async () => {
  const res = await gate(page("/", "wrapbox-gate-main=1"));
  assert.equal(res.status, 401);
  const old = await gate(login("96183"));
  assert.equal(old.status, 401);
  assert.equal(old.headers.get("set-cookie"), null);
});

test("wrong password: 401, shake, no cookie", async () => {
  const res = await gate(login("nope"));
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("set-cookie"), null);
  assert.match(await res.text(), /class="shake"/);
});

test("right password: 303 with HttpOnly Secure Partitioned cookie that then unlocks", async () => {
  const res = await gate(login(PASSWORD, "/portfolio.html"));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get("location"), "/portfolio.html");
  const set = res.headers.get("set-cookie")!;
  for (const a of ["HttpOnly", "Secure", "SameSite=None", "Partitioned", "Path=/"]) assert.ok(set.includes(a), a);
  const cookie = set.split(";")[0];
  const ok = await gate(page("/", cookie));
  assert.notEqual(ok.status, 401); // next(): request continues to the static site
  assert.equal(ok.headers.get("x-middleware-next"), "1");
});

test("open redirect is refused", async () => {
  for (const evil of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"]) {
    const res = await gate(login(PASSWORD, evil));
    assert.equal(res.headers.get("location"), "/", evil);
  }
});

test("forged, tampered, expired and alien-secret cookies are rejected", () => {
  const good = makeSession(SECRET);
  assert.equal(validSession(SECRET, `wb_gate=${good}`), true);
  const [v, exp, sig] = good.split(".");
  assert.equal(validSession(SECRET, `wb_gate=${v}.${Number(exp) + 1000}.${sig}`), false);
  assert.equal(validSession(SECRET, `wb_gate=${v}.${exp}.${"A".repeat(43)}`), false);
  assert.equal(validSession(SECRET, `wb_gate=${makeSession("x".repeat(40))}`), false);
  assert.equal(validSession(SECRET, `wb_gate=${good}`, Date.now() + 8 * 24 * 3600 * 1000), false);
  assert.equal(validSession(SECRET, null), false);
  assert.equal(validSession(SECRET, "wb_gate=1"), false);
});

test("fails closed when not configured", async () => {
  const keep = process.env.WRAPBOX_GATE_HASH;
  delete process.env.WRAPBOX_GATE_HASH;
  const res = await gate(page("/"));
  assert.equal(res.status, 503);
  process.env.WRAPBOX_GATE_HASH = keep;
});

test("brute-force throttle kicks in", async () => {
  let last = 0;
  for (let i = 0; i < 10; i++) last = (await gate(new Request(BASE + "/__wb_gate", {
    method: "POST", body: new URLSearchParams({ password: "x" + i }),
    headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "7.7.7.7" } }))).status;
  assert.equal(last, 429);
});
