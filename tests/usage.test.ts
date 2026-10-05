// Detector usage on the Core Brain page is counted from recorded findings, never typed in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectorUsage } from "../src/engine/usage";
import { getState, resetDemoData } from "../src/state/store";

test("detector usage: every count comes from the events' own findings", () => {
  resetDemoData();
  const events = getState().events;
  const use = detectorUsage(events);
  assert.ok(use.size > 0, "the seeded history has findings");
  for (const [id, u] of use) {
    const hits = events.filter((e) => e.inspection?.findings.some((f) => f.detector === id));
    assert.equal(u.actions, hits.length, `${id} actions`);
    assert.equal(u.items, hits.reduce((n, e) => n + e.inspection!.findings.filter((f) => f.detector === id).reduce((m, f) => m + f.count, 0), 0), `${id} items`);
    assert.equal(u.users.reduce((n, x) => n + x.actions, 0), u.actions, `${id} per-user counts add up`);
    assert.equal(Object.values(u.byDecision).reduce((a, b) => a + (b ?? 0), 0), u.actions, `${id} outcomes add up`);
    assert.equal(u.latest?.timestamp, Math.max(...hits.map((e) => e.timestamp)));
  }
  // A detector that never fired is simply absent — no zero rows invented.
  assert.equal(detectorUsage([]).size, 0);
});
