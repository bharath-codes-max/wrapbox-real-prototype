// Task Envelope is really enforced; park / resume; once vs scoped vs deny.
import { test } from "node:test";
import assert from "node:assert/strict";
import { decide } from "../src/engine/brain";
import { SEED_CONTRACTS } from "../src/model/contracts";
import type { IntentContract, TaskEnvelope } from "../src/model/types";
import { getSeq } from "../src/engine/simulate";

async function freshTask() {
  const store = await import("../src/state/store");
  store.resetDemoData();
  const t = store.startTask();
  store.advanceTask(t.taskId);
  const task = () => store.getState().tasks.find((x) => x.taskId === t.taskId)!;
  const eventOf = (i: number) => store.getState().events.find((e) => e.id === task().steps[i].eventId)!;
  return { store, task, eventOf };
}

test("start: production deploy (step 6) parks; independent steps finish; step 10 waits", async () => {
  const { task } = await freshTask();
  const st = task().steps.map((s) => s.state);
  assert.equal(st[5], "parked");
  assert.deepEqual([st[6], st[7], st[8]], ["done", "done", "done"]);
  assert.equal(st[9], "waiting_dependency");
  assert.equal(task().status, "parked");
});

test("Approve once: only the deploy is allowed — the production health check parks for its own review", async () => {
  const { store, task, eventOf } = await freshTask();
  store.resolveReview(eventOf(5).id, "approved", "u-alex");
  assert.equal(task().steps[5].state, "done");
  assert.equal(task().steps[9].state, "parked");
  assert.equal(eventOf(9).decidedBy?.layer, "envelope"); // production is outside the envelope
  assert.equal(task().status, "parked");
});

test("Approve scoped: the task may use production for the rest of the job — health check runs, task completes", async () => {
  const { store, task, eventOf } = await freshTask();
  store.resolveReview(eventOf(5).id, "approved_scoped", "u-alex");
  assert.equal(task().grants?.[0]?.environment, "production");
  assert.equal(task().steps[9].state, "done");
  assert.equal(eventOf(9).decision, "ALLOW");
  assert.equal(task().status, "completed");
  assert.match(eventOf(5).reviewState!.scope!, /This task may use/);
});

test("Deny: the deploy stays blocked, the step that needed it is skipped, task is stopped", async () => {
  const { store, task, eventOf } = await freshTask();
  store.resolveReview(eventOf(5).id, "denied", "u-alex");
  assert.equal(task().steps[5].state, "blocked");
  assert.equal(task().steps[9].state, "skipped");
  assert.equal(task().status, "stopped");
});

test("the envelope is enforced by the brain: outside scope, forbidden, file budget, expiry", () => {
  const cs = structuredClone(SEED_CONTRACTS) as IntentContract[];
  const now = Date.UTC(2026, 8, 24, 12);
  const env: TaskEnvelope = {
    taskId: "t", title: "Fix checkout", agent: "a-claude-code", user: "u-daniel",
    allowedResources: ["src/"], allowedActions: ["READ", "WRITE"], environment: "development",
    forbidden: ["production", ".env"], durationMin: 30, startedAt: now, fileBudget: 2, filesUsed: 0,
    status: "active", steps: [],
  };
  const base = {
    plane: "ENDPOINT" as const, agent: "a-claude-code", user: "u-daniel", environment: "development" as const,
    context: { environment: "development" as const, resourceSensitivity: "internal" as const, privileged: false, businessHours: true },
    envelope: env, now,
  };
  assert.equal(decide({ ...base, action: "READ", resource: "src/app.ts" }, cs).decision, "ALLOW");
  assert.equal(decide({ ...base, action: "READ", resource: "billing/app.ts" }, cs).decision, "REVIEW"); // outside scope
  assert.equal(decide({ ...base, action: "READ", resource: ".env" }, cs).decidedBy.layer, "envelope"); // forbidden
  assert.equal(decide({ ...base, action: "WRITE", resource: "src/a.ts", envelope: { ...env, filesUsed: 2 } }, cs).decision, "REVIEW"); // budget
  assert.equal(decide({ ...base, action: "READ", resource: "src/app.ts", now: now + 31 * 60_000 }, cs).decision, "REVIEW"); // expired
  const granted = { ...env, grants: [{ resource: "r-aws-prod", environment: "production" as const, grantedBy: "u-alex", at: now }] };
  assert.equal(decide({ ...base, action: "READ", resource: "r-aws-prod", environment: "production", envelope: granted }, cs).decision, "ALLOW");
});

// ---------------------------------------------------------------------------
// Create a task — the admin writes a job from the Tasks screen (Write a new
// task). Every draft maps onto the same TaskJob shape the built-in jobs use,
// so it must run through the identical engine path: startTask() / advanceTask()
// can't tell a created job from a seeded one, and the preview an admin sees
// before creating it must match what the task actually does once started.
// ---------------------------------------------------------------------------

function baseDraft(overrides: Partial<import("../src/state/store").TaskJobDraft> = {}) {
  return {
    title: "Weekly customer CSV sync",
    team: "Engineering" as const,
    agent: "a-claude-code",
    user: "u-priya",
    approver: "u-daniel",
    approverRole: "",
    allowedResources: ["customer-db"],
    allowedActions: ["READ", "WRITE"] as import("../src/model/types").ActionVerb[],
    environment: "development" as const,
    forbidden: ["production"],
    durationMin: 30,
    fileBudget: 25,
    steps: [
      { label: "Read matching rows", action: "READ" as const, resource: "customer-db", environment: "development" as const, sensitivity: "internal" as const, dependsOn: [] },
      { label: "Export to partner store", action: "WRITE" as const, resource: "customer-db", environment: "production" as const, sensitivity: "customer-impacting" as const, dependsOn: [0] },
    ],
    ...overrides,
  };
}

test("taskJobError: a sound draft passes; the common mistakes are each caught", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  assert.equal(store.taskJobError(baseDraft()), null);
  assert.match(store.taskJobError(baseDraft({ title: "" }))!, /title/i);
  assert.match(store.taskJobError(baseDraft({ approver: "u-priya" }))!, /can't be the same person/i); // asker === approver
  assert.match(store.taskJobError(baseDraft({ allowedResources: [] }))!, /at least one system/i);
  assert.match(store.taskJobError(baseDraft({ allowedActions: [] }))!, /at least one thing/i);
  assert.match(store.taskJobError(baseDraft({ durationMin: 0 }))!, /time window/i);
  assert.match(store.taskJobError(baseDraft({ steps: [baseDraft().steps[0]] }))!, /at least two steps/i); // single step ≠ task
  const badDep = baseDraft(); badDep.steps[0] = { ...badDep.steps[0], dependsOn: [1] }; // step 1 can't depend on step 2
  assert.match(store.taskJobError(badDep)!, /before it/i);
});

test("previewTaskSteps: the live preview matches what the task actually decides once created", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  const eventsBefore = store.getState().events.length;
  const seqBefore = getSeq();

  const draft = baseDraft();
  const preview = store.previewTaskSteps(draft);
  assert.equal(preview.length, 2);
  assert.equal(preview[0].decision, "ALLOW"); // in scope, allowed action, development
  assert.equal(preview[1].decision, "REVIEW"); // production is on the forbidden list

  // A preview must be a true what-if: it records nothing and burns no ids.
  assert.equal(store.getState().events.length, eventsBefore);
  assert.equal(getSeq(), seqBefore);

  const out = store.createTaskJob(draft);
  assert.notEqual(typeof out, "string");
  const job = out as import("../src/engine/scenarios").TaskJob;
  const t = store.startTask(job.id);
  store.advanceTask(t.taskId);
  const task = store.getState().tasks.find((x) => x.taskId === t.taskId)!;
  assert.equal(task.steps[0].state, "done"); // matches preview[0]
  assert.equal(task.steps[1].state, "parked"); // matches preview[1]
  assert.equal(task.status, "parked");
});

test("createTaskJob: a custom job appears in Start a task and runs through the identical engine as a seeded one", async () => {
  const store = await import("../src/state/store");
  const { TASK_JOBS } = await import("../src/engine/scenarios");
  store.resetDemoData();
  const before = store.getState().customJobs.length;
  const out = store.createTaskJob(baseDraft());
  assert.notEqual(typeof out, "string", out as string);
  const job = out as import("../src/engine/scenarios").TaskJob;
  assert.equal(store.getState().customJobs.length, before + 1);
  assert.equal(store.jobByIdAny(job.id).id, job.id); // visible to the same lookup startTask()/advanceTask() use
  assert.equal(store.jobByIdAny(TASK_JOBS[0].id).id, TASK_JOBS[0].id); // built-ins still resolve too

  const t = store.startTask(job.id);
  assert.equal(t.allowedResources.join(), job.envelope.allowedResources.join());
  assert.equal(t.forbidden.join(), job.envelope.forbidden.join());
  assert.equal(t.durationMin, job.envelope.durationMin);
  assert.equal(t.fileBudget, job.envelope.fileBudget);
  assert.equal(t.approver, "u-daniel");
});

test("createTaskJob: an invalid draft is rejected and nothing is created", async () => {
  const store = await import("../src/state/store");
  store.resetDemoData();
  const before = store.getState().customJobs.length;
  const out = store.createTaskJob(baseDraft({ title: "" }));
  assert.equal(typeof out, "string");
  assert.equal(store.getState().customJobs.length, before);
});
