// Core Brain → The checks: the per-action trace is read off the recorded event.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTrace, CHECK_ORDER } from "../src/engine/trace";
import { getState, resetDemoData } from "../src/state/store";

test("check trace: 14 checks per action, exactly one gave the answer, and it is the recorded one", () => {
  resetDemoData();
  const { events, standing } = getState();
  assert.equal(CHECK_ORDER.length, 14);
  for (const e of events) {
    const t = checkTrace(e, standing);
    assert.deepEqual(t.map((x) => x.layer), CHECK_ORDER);
    const decided = t.filter((x) => x.state === "decided");
    assert.equal(decided.length, 1, `${e.id}: exactly one check decides`);
    assert.equal(decided[0].layer, e.decidedBy?.layer ?? "default");
    if (e.decidedBy) assert.equal(decided[0].note, e.decidedBy.label);
    const by = Object.fromEntries(t.map((x) => [x.layer, x]));
    // "noted" is only claimed when the event really carries that fact.
    if (by.contract.state === "noted") assert.ok(e.matchedContracts.length > 0);
    if (by.safety.state === "noted") assert.ok(e.safetyRules.length > 0);
    if (by.contract.state === "clear") assert.equal(e.matchedContracts.length, 0);
    if (by.safety.state === "clear") assert.equal(e.safetyRules.length, 0);
    assert.ok(t.every((x) => x.note.length > 0));
  }
});

test("check trace: a newly run scenario is traced like any other action", async () => {
  resetDemoData();
  const store = await import("../src/state/store");
  const before = store.getState().events.length;
  const ev = store.simulateById("ep-run-tests")!;
  assert.equal(store.getState().events.length, before + 1);
  const t = checkTrace(ev, store.getState().standing);
  assert.equal(t.filter((x) => x.state === "decided").length, 1);
  assert.equal(t.find((x) => x.state === "decided")!.layer, ev.decidedBy?.layer ?? "default");
  resetDemoData();
});

test("checks: the scenario offered for a check is really decided by that check when run", async () => {
  const store = await import("../src/state/store");
  for (const fresh of [false, true]) {
    resetDemoData();
    if (fresh) store.startFreshWorkspace();
    const offered = store.scenariosByCheck();
    assert.ok(Object.keys(offered).length >= 5, "several checks can be shown without setup");
    for (const [layer, sc] of Object.entries(offered)) {
      // Re-ask before each run: an earlier run can change what the engine knows (an untrusted read).
      const now = store.scenariosByCheck()[layer as keyof typeof offered];
      if (!now) continue;
      const ev = store.simulate(now);
      assert.equal(ev.decidedBy?.layer ?? "default", layer, `${sc.id} should be decided by ${layer}`);
    }
  }
  store.switchWorkspace("demo");
  resetDemoData();
});
