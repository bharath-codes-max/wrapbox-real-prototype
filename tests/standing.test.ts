// Standing permissions are enforced: limits, "may not", revoke, expiry; tasks unaffected.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_CONTRACTS } from "../src/model/contracts";
import { scenarioById } from "../src/engine/scenarios";
import { runScenario, setSeq, setTokenCounter } from "../src/engine/simulate";
import type { IntentContract, StandingPermission } from "../src/model/types";

async function seedStanding() {
  const { standingSeed } = await import("../src/state/store");
  return standingSeed(Date.UTC(2026, 8, 24));
}
function run(id: string, standing: StandingPermission[], now = Date.UTC(2026, 8, 24, 12)) {
  setSeq(8000); setTokenCounter(800);
  return runScenario(scenarioById(id)!, structuredClone(SEED_CONTRACTS) as IntentContract[], "t", { standing, timestamp: now }).event;
}

test("active permissions: in-scope everyday work flows", async () => {
  const sp = await seedStanding();
  assert.equal(run("gw-select-50", sp).decision, "ALLOW");
  assert.equal(run("gw-select-300", sp).decision, "ALLOW"); // within 500
  assert.equal(run("gw-push-feature", sp).decision, "ALLOW");
});

test("narrowing the row limit (Autopilot 500 → 200) makes a 300-row query need a yes", async () => {
  const sp = (await seedStanding()).map((p) => (p.id === "sp-002" ? { ...p, maxRows: 200 } : p));
  const e = run("gw-select-300", sp);
  assert.equal(e.decision, "REVIEW");
  assert.equal(e.decidedBy?.layer, "standing");
  assert.match(e.decidedBy!.label, /above the standing limit of 200/);
  assert.equal(run("gw-select-50", sp).decision, "ALLOW");
});

test("revoked or expired: that agent's everyday work there needs a yes", async () => {
  const revoked = (await seedStanding()).map((p) => (p.id === "sp-002" ? { ...p, status: "revoked" as const } : p));
  assert.equal(run("gw-select-50", revoked).decision, "REVIEW");
  const expired = (await seedStanding()).map((p) => (p.id === "sp-001" ? { ...p, expiresAt: Date.UTC(2026, 8, 1) } : p));
  const e = run("gw-push-feature", expired);
  assert.equal(e.decision, "REVIEW");
  assert.match(e.decidedBy!.label, /expired/);
});

test("store: autopilot narrowing and revoke/grant-again change real decisions; tasks keep their own authority", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  store.acceptAutopilot("ap-002");
  assert.equal(store.getState().standing.find((p) => p.id === "sp-002")!.maxRows, 200);
  assert.equal(store.simulateById("gw-select-300")!.decision, "REVIEW");
  store.revokeStanding("sp-001");
  assert.equal(store.simulateById("gw-push-feature")!.decision, "REVIEW");
  // the engineering task commits to the same repo — its slip is the authority
  const t = store.startTask("job-eng-checkout"); store.advanceTask(t.taskId);
  const commit = store.getState().tasks.find((x) => x.taskId === t.taskId)!.steps[4];
  assert.equal(commit.decision, "ALLOW");
  store.grantStandingAgain("sp-001", "u-priya");
  assert.equal(store.simulateById("gw-push-feature")!.decision, "ALLOW");
  store.resetDemoData();
});

// ── Granting a new permission (the create flow on the Standing Permissions page) ──
test("granting: the new card is enforced by the Core Brain, and a second card on the same pair is refused", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  const ev = (id: string) => { const s = store.getState(); return store.shadowEvent(scenarioById(id)!, s.contracts, s.kernel, s.standing); };

  // Before any card on this pair, Claude Code deleting scratch test data just flows.
  assert.equal(ev("ctx-del-testdb").decision, "ALLOW");
  const before = store.getState().standing.length;

  const made = store.grantStanding({ agent: "a-claude-code", resource: "r-test-db", actions: ["READ"], environments: ["test"], denyIds: [], days: 7, grantedBy: "u-priya" });
  assert.equal(typeof made, "object");
  const perm = made as StandingPermission;
  assert.equal(store.getState().standing.length, before + 1);
  assert.equal(perm.status, "active");
  assert.equal(perm.grantedBy, "u-priya");
  assert.ok(!store.getState().standing.slice(0, before).some((p) => p.id === perm.id), "id must be new");
  assert.ok(Math.abs(perm.expiresAt - (Date.now() + 7 * 24 * 3600 * 1000)) < 5000);

  // The card allows READ only — DELETE is now outside it and needs a person.
  const after = ev("ctx-del-testdb");
  assert.equal(after.decision, "REVIEW");
  assert.equal(after.decidedBy?.layer, "standing");
  assert.match(after.decidedBy!.label, /outside the standing permission/);

  // One card per agent + system: a second is refused and nothing changes.
  const dup = store.grantStanding({ agent: "a-claude-code", resource: "r-test-db", actions: ["READ", "DELETE"], environments: ["test"], denyIds: [], days: 7, grantedBy: "u-priya" });
  assert.equal(typeof dup, "string");
  assert.match(dup as string, /already has a permission/);
  assert.equal(store.getState().standing.length, before + 1);

  // Revoking the new card: that work still needs a yes, now because it lapsed.
  store.revokeStanding(perm.id);
  assert.match(ev("ctx-del-testdb").decidedBy!.label, /revoked/);
  store.resetDemoData();
});

test("granting: a card that covers the action leaves it flowing; an explicit 'may not' holds it", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  const ev = (id: string) => { const s = store.getState(); return store.shadowEvent(scenarioById(id)!, s.contracts, s.kernel, s.standing); };
  assert.equal(ev("out-refund-18").decision, "ALLOW");
  assert.equal(typeof store.grantStanding({ agent: "a-support", resource: "r-stripe", actions: ["READ", "WRITE"], environments: ["production"], denyIds: [], days: 3, grantedBy: "u-priya" }), "object");
  assert.equal(ev("out-refund-18").decision, "ALLOW");

  store.resetDemoData();
  assert.equal(typeof store.grantStanding({ agent: "a-support", resource: "r-stripe", actions: ["READ", "WRITE"], environments: ["production", "staging"], denyIds: ["prod"], days: 3, grantedBy: "u-priya" }), "object");
  const held = ev("out-refund-18");
  assert.equal(held.decision, "REVIEW");
  assert.match(held.decidedBy!.label, /may not: anything in production/);
  store.resetDemoData();
});

test("granting: invalid grants are refused with a reason and create nothing", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  const base = { agent: "a-codex", resource: "r-aws-staging", actions: ["READ"] as const, environments: ["staging"] as const, denyIds: [] as string[], days: 7, grantedBy: "u-priya" };
  const n = store.getState().standing.length;
  const bad = (g: Record<string, unknown>) => store.grantStanding({ ...base, actions: [...base.actions], environments: [...base.environments], ...g } as never);
  assert.match(bad({ actions: [] }) as string, /at least one thing/);
  assert.match(bad({ actions: ["SECRET_ACCESS"] }) as string, /can't be standing authority/);
  assert.match(bad({ environments: [] }) as string, /environment/);
  assert.match(bad({ days: 0 }) as string, /between 1 and 30/);
  assert.match(bad({ days: 90 }) as string, /between 1 and 30/);
  assert.match(bad({ agent: "a-unknown-mcp" }) as string, /registered agent/);
  assert.match(bad({ environments: ["production"], denyIds: ["prod"] }) as string, /cancels everything/);
  assert.equal(store.getState().standing.length, n);
  assert.equal(typeof bad({}), "object"); // the valid base grant does go through
  assert.equal(store.getState().standing.length, n + 1);
  store.resetDemoData();
});
