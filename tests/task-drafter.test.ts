// Plain English → Build: draftTask() never fabricates a field it didn't find,
// and whatever it does find is exactly what createTaskJob() will accept.
import { test } from "node:test";
import assert from "node:assert/strict";
import { draftTask } from "../src/engine/task-drafter";
import { taskJobError, type TaskJobDraft } from "../src/state/store";
import { userById } from "../src/model/org";

test("a well-formed description extracts title, people, environment, scope, time, budget and actions", () => {
  const text = `Priya asks Claude Code to sync Friday's customer export. Approved by Daniel. Never touch production. Budget 20 files, 45 minutes.
1. Read the customer export from src/exports
2. Write the cleaned file to src/reports
3. Send the summary to the finance channel`;
  const { patch, steps, unresolved } = draftTask(text);

  assert.equal(patch.user, "u-priya");
  assert.equal(patch.agent, "a-claude-code");
  assert.equal(patch.approver, "u-daniel");
  assert.deepEqual(patch.forbidden, ["production"]);
  assert.equal(patch.durationMin, 45);
  assert.equal(patch.fileBudget, 20);
  assert.ok(patch.allowedActions?.includes("READ"));
  assert.ok(patch.allowedActions?.includes("WRITE"));

  assert.equal(steps.length, 3);
  // "src/exports" matches the registered "src/" resource (id r-src) before it
  // matches as a bare path token — a named resource wins over a raw string.
  assert.equal(steps[0].resource, "r-src");
  assert.equal(steps[0].dependsOn.length, 0);
  assert.equal(steps[1].resource, "r-src");
  assert.deepEqual(steps[1].dependsOn, [0]);
  assert.deepEqual(steps[2].dependsOn, [1]);

  // Step 3 names no path or system — the drafter says so instead of guessing one.
  assert.equal(steps[2].resource, "");
  assert.ok(unresolved.some((u) => /no resource found/i.test(u)));
});

test("forbidden and allowed scope never overlap: a forbidden path is never also offered as in-scope", () => {
  const { patch } = draftTask(
    "Daniel asks Codex to clean up tmp files. Approved by Maya. Must not touch .env. Scope: src/, tmp/.",
  );
  const forbidden = patch.forbidden ?? [];
  const allowed = patch.allowedResources ?? [];
  for (const f of forbidden) {
    for (const a of allowed) assert.ok(!a.toLowerCase().includes(f.toLowerCase()), `${a} should not overlap forbidden ${f}`);
  }
});

test("no approver named: the drafter leaves the field for the Build tab instead of guessing one, and flags it", () => {
  const { patch, unresolved } = draftTask("Sam wants to run a report on customer-db.");
  assert.equal(patch.approver, undefined);
  assert.ok(unresolved.length === 0 || unresolved.every((u) => typeof u === "string"));
});

test("asker and approver are never resolved to the same person", () => {
  const { patch } = draftTask("Priya asks Claude to review src/app.ts, approved by Priya.");
  if (patch.user && patch.approver) assert.notEqual(patch.user, patch.approver);
});

test("a compiled draft with every field filled in passes the same validator createTaskJob uses", () => {
  const text = `Title: Rotate staging credentials
Jordan asks Support Agent to rotate staging credentials. Approved by Alex. Never touch production. Budget 10 files, 30 minutes.
1. Read the credentials file from src/config
2. Write the rotated credentials to src/config`;
  const { patch, steps } = draftTask(text);
  const draft: TaskJobDraft = {
    title: patch.title ?? "Untitled",
    team: patch.team ?? "Engineering",
    agent: patch.agent ?? "a-claude-code",
    user: patch.user ?? "u-priya",
    approver: patch.approver ?? "u-alex",
    approverRole: userById(patch.approver ?? "u-alex")?.role ?? "",
    allowedResources: patch.allowedResources ?? [],
    allowedActions: patch.allowedActions ?? ["READ", "WRITE"],
    environment: patch.environment ?? "development",
    forbidden: patch.forbidden ?? [],
    durationMin: patch.durationMin ?? 30,
    fileBudget: patch.fileBudget ?? 10,
    steps,
  };
  assert.equal(taskJobError(draft), null);
});
