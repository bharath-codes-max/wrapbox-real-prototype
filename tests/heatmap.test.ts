import { test } from "node:test";
import assert from "node:assert/strict";
import { buildHeatmap, heatLevel, HEAT_COLS } from "../src/ui/heatmap";
import { getState } from "../src/state/store";
import { AGENTS } from "../src/model/org";
import type { Decision, SimulationEvent } from "../src/model/types";

const H = 3_600_000;
const ev = (id: string, agent: string, decision: Decision, timestamp: number) =>
  ({ id, agent, decision, timestamp }) as SimulationEvent;

test("heatmap: every seeded event lands in exactly one cell of its agent's row", () => {
  const events = getState().events;
  const now = Math.max(...events.map((e) => e.timestamp)) + 60_000;
  const h = buildHeatmap(events, AGENTS.map((a) => a.id), now);
  const total = h.rows.reduce((n, r) => n + r.cells.reduce((m, c) => m + c.count, 0), 0);
  assert.equal(h.dropped, 0);
  assert.equal(total, events.length);
  for (const e of events) {
    const row = h.rows.find((r) => r.agent === e.agent)!;
    const col = Math.floor((e.timestamp - h.start) / h.bucketMs);
    assert.ok((row.cells[col].byDecision[e.decision] ?? 0) >= 1, `${e.id} missing from its cell`);
  }
});

test("heatmap: a cell is coloured by its most severe decision, counts every one", () => {
  const now = 100 * H;
  const h = buildHeatmap(
    [ev("a", "x", "ALLOW", now - 30 * 60_000), ev("b", "x", "BLOCK", now - 20 * 60_000), ev("c", "x", "REVIEW", now - 10 * 60_000)],
    ["x"], now,
  );
  const c = h.rows[0].cells[HEAT_COLS - 1];
  assert.equal(c.count, 3);
  assert.equal(c.tone, "BLOCK");
  assert.equal(c.latest?.id, "c");
  assert.deepEqual(c.byDecision, { ALLOW: 1, BLOCK: 1, REVIEW: 1 });
});

test("heatmap: the bucket grows to cover the history; unknown agents are counted as dropped", () => {
  const now = 1000 * H;
  const h = buildHeatmap([ev("old", "x", "ALLOW", now - 400 * H), ev("ghost", "nobody", "ALLOW", now - H)], ["x"], now);
  assert.ok(h.bucketMs * HEAT_COLS > 400 * H);
  assert.equal(h.dropped, 1);
  assert.equal(h.rows[0].cells.reduce((n, c) => n + c.count, 0), 1);
});

test("heatmap: intensity is relative to the busiest cell", () => {
  assert.equal(heatLevel(0, 5), 0);
  assert.equal(heatLevel(1, 8), 1);
  assert.equal(heatLevel(8, 8), 4);
  assert.equal(heatLevel(1, 1), 4);
});
