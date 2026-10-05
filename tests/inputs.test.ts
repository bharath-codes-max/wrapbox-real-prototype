// Core Brain → Decision inputs: the 15 facts are read off the recorded event, never typed in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decisionInputs, inputPresence, INPUT_GROUPS } from "../src/engine/inputs";
import { getState, resetDemoData } from "../src/state/store";
import { userById, agentById } from "../src/model/org";

test("decision inputs: every recorded action yields the same 15 inputs, filled from that action", () => {
  resetDemoData();
  const { events, standing } = getState();
  assert.ok(events.length > 0);
  const keys = decisionInputs(events[0], standing).map((r) => r.key);
  assert.equal(keys.length, 15);
  assert.equal(new Set(keys).size, 15);
  for (const e of events) {
    const rows = decisionInputs(e, standing);
    assert.deepEqual(rows.map((r) => r.key), keys, `${e.id} same inputs in the same order`);
    assert.ok(rows.every((r) => INPUT_GROUPS.some((g) => g.id === r.group)));
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    assert.equal(by.who.value, userById(e.user)?.name ?? e.user);
    assert.equal(by.agent.value, agentById(e.agent)?.name ?? e.agent);
    assert.equal(by.action.value, e.action);
    assert.equal(by.contract.present, e.matchedContracts.length > 0);
    assert.equal(by.safety.present, e.safetyRules.length > 0);
    assert.equal(by.mcp.present, !!e.mcp);
    assert.equal(by.delegation.present, !!e.delegation?.length);
    assert.equal(by.supplier.present, !!e.operator);
    // At most one input is marked as the one the deciding gate read, and it is really there.
    const hot = rows.filter((r) => r.decided);
    assert.ok(hot.length <= 1);
    if (e.decidedBy?.layer === "contract") assert.equal(hot[0]?.key, "contract");
    if (e.decidedBy?.layer === "safety") assert.equal(hot[0]?.key, "safety");
    if (hot[0] && ["contract", "safety", "supplier", "delegation"].includes(hot[0].key)) assert.equal(hot[0].present, true, `${e.id}: deciding input must be present`);
  }
});

test("decision inputs: presence counts add up from the events", () => {
  resetDemoData();
  const { events, standing } = getState();
  const p = inputPresence(events, standing);
  assert.equal(p.who, events.length);
  assert.equal(p.contract, events.filter((e) => e.matchedContracts.length > 0).length);
  assert.equal(p.mcp ?? 0, events.filter((e) => e.mcp).length);
  assert.deepEqual(inputPresence([]), {});
});
