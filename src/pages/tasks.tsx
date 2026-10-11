// Tasks — Task Envelope visualization + Safe Continuation (park/resume).
// The 10-step "Fix checkout and deploy" workflow runs through the real brain:
// step 6 (production deploy) parks; independent steps continue; approval resumes.
import {
  useAppState, startTask, advanceTask,
  createTaskJob, taskJobError, previewTaskSteps,
  TASK_TEAMS, TASK_SENSITIVITIES, TASK_STEP_ACTIONS,
  type TaskJobDraft, type TaskStepDraft,
} from "../state/store";
import { TASK_JOBS } from "../engine/scenarios";
import { PageHead, SectionHead, MetricBar, Chip, DecisionChip, SimNote, AgentMark, Avatar, PageTabs, usePaged, Pager, Progress, EntityCard, CardGrid, FilterBar, useCardFilters, Select } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import { Modal } from "../ui/setup";
import { DESKTOP_SHELL } from "../ui/shell";
import { useMemo, useState } from "react";
import { AGENTS, USERS, RESOURCES, agentById, resourceById, userById } from "../model/org";
import type { ActionVerb, Environment, TaskEnvelope } from "../model/types";
import { Boxes, ShieldOff, Timer, FileStack, Play, PauseOctagon, Sunrise, ArrowRight, Plus, X, Check, Trash2 } from "lucide-react";

const TASK_ENVIRONMENTS: Environment[] = ["development", "test", "staging", "production", "local"];
// Secrets and unregistered servers are never a task's default scope — same rule as Standing Permissions.
const TASK_RESOURCES = RESOURCES.filter((r) => r.kind !== "secret" && r.kind !== "mcp");
const SCOPE_PRESETS = ["src/", "tests/", "tmp/", "docs/", "CHANGELOG.md"];
const FORBIDDEN_PRESETS = ["production", ".env", "credentials"];

/** In progress = still running or parked for approval; everything else has finished (completed, stopped, expired). */
const isInProgress = (t: TaskEnvelope) => t.status === "active" || t.status === "parked";

/** One status chip for a task — shared by the list row and the panel header so they can never disagree. */
function TaskStatusChip({ t }: { t: TaskEnvelope }) {
  return (
    <Chip tone={t.status === "completed" ? "allow" : t.status === "parked" ? "review" : t.status === "stopped" ? "block" : "constrain"}>
      {t.status === "stopped" ? "PARTLY DONE" : t.status.toUpperCase()}
    </Chip>
  );
}

// Each execution state maps to a decision tone; blank tones render as quiet/inactive.
const STEP_TONE: Record<string, string> = {
  done: "allow",
  running: "constrain",
  parked: "review",
  blocked: "block",
};

function StepState({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["neutral", "pending"],
    running: ["constrain", "running"],
    done: ["allow", "done"],
    parked: ["review", "PARKED"],
    blocked: ["block", "blocked"],
    waiting_dependency: ["neutral", "waiting on dependency"],
    skipped: ["neutral", "skipped — needed a stopped step"],
  };
  const [tone, label] = map[s] ?? ["neutral", s];
  return <Chip tone={tone}>{label}</Chip>;
}

/** Slim progress meter — token-coloured, no big number box. */
function Meter({ pct, done }: { pct: number; done?: boolean }) {
  // A finished task used its window — that isn't a warning, so it never turns red.
  return (
    <div style={{ marginTop: 7 }}>
      <Progress value={pct} max={100} size="sm" tone={done ? undefined : pct >= 90 ? "block" : pct >= 75 ? "review" : undefined} />
    </div>
  );
}

/** The lead visual of every task panel: steps as a connected horizontal pipeline. */
function StepTimeline({ steps, onOpen }: { steps: TaskEnvelope["steps"]; onOpen: (id: string) => void }) {
  return (
    <div className="scroll-thin" style={{ display: "flex", overflowX: "auto", paddingBottom: 6 }}>
      {steps.map((st, i) => {
        const tone = STEP_TONE[st.state];
        const last = i === steps.length - 1;
        const clickable = !!st.eventId;
        return (
          <div
            key={st.index}
            onClick={() => clickable && onOpen(st.eventId!)}
            title={st.dependsOn.length ? `Depends on step ${st.dependsOn.map((d) => d + 1).join(", ")}` : undefined}
            style={{ flex: "1 0 172px", minWidth: 172, cursor: clickable ? "pointer" : "default" }}
          >
            <div className="row" style={{ gap: 0, flexWrap: "nowrap", alignItems: "center" }}>
              <span
                style={{
                  width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                  display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  ...(tone
                    ? { background: `var(--${tone})`, color: "var(--accent-fg)" }
                    : { background: "var(--surface-2)", color: "var(--fg-3)", boxShadow: "inset 0 0 0 1px var(--line-strong)" }),
                }}
              >
                {st.index + 1}
              </span>
              {!last && (
                <span style={{ flex: 1, height: 2, borderRadius: 2, marginRight: 2, background: st.state === "done" ? "var(--allow)" : "var(--line-strong)" }} />
              )}
            </div>
            <div style={{ marginTop: 11, paddingRight: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1.35 }}>{st.label}</div>
              <div className="mono faint" style={{ fontSize: 11, marginTop: 3, overflowWrap: "anywhere" }}>
                {st.action} · {resourceById(st.resource)?.name ?? st.resource}
              </div>
              <div className="row" style={{ gap: 5, marginTop: 9 }}>
                {st.decision ? <DecisionChip d={st.decision} small /> : null}
                <StepState s={st.state} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EnvelopeCard({ t, nav }: { t: TaskEnvelope; nav: (r: string) => void }) {
  const s = useAppState();
  const [openEvt, setOpenEvt] = useState<string | null>(null);
  const evt = openEvt ? s.events.find((e) => e.id === openEvt) : null;
  const elapsed = Math.round((Date.now() - t.startedAt) / 60000);
  const remaining = Math.max(0, t.durationMin - elapsed);
  const finished = t.status === "completed" || t.status === "stopped";
  const timePct = finished ? 100 : Math.min(100, (elapsed / t.durationMin) * 100);
  const filePct = Math.min(100, (t.filesUsed / t.fileBudget) * 100);
  const parked = t.steps.filter((x) => x.state === "parked");
  const hasPending = t.steps.some((x) => x.state === "pending");

  return (
    <div className="card">
      {/* Header — agent mark, task, and the people this run belongs to */}
      <div className="spread">
        <div className="row" style={{ gap: 12, minWidth: 0, alignItems: "flex-start", flexWrap: "nowrap" }}>
          <AgentMark agentId={t.agent} size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>{t.title}</div>
            <div className="row small dim" style={{ marginTop: 5, gap: 6 }}>
              <span>{agentById(t.agent)?.name}</span>
              <span className="faint">·</span>
              <span className="row" style={{ gap: 5 }}>asked by <Avatar userId={t.user} size={16} /> {userById(t.user)?.name}</span>
              {t.approver && (
                <>
                  <span className="faint">·</span>
                  <span className="row" style={{ gap: 5 }}>risky steps → <Avatar userId={t.approver} size={16} /> {userById(t.approver)?.name} <span className="faint">({t.approverRole})</span></span>
                </>
              )}
              {t.templateName && (
                <>
                  <span className="faint">·</span>
                  <span>slip: {t.templateName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 6, flexShrink: 0 }}>
          {t.team && <Chip tone="neutral">{t.team}</Chip>}
          <TaskStatusChip t={t} />
        </div>
      </div>

      {/* Permission envelope — the scope this run is boxed inside, as chips + meters */}
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <div className="grid g2" style={{ gap: 20 }}>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label row" style={{ gap: 6 }}><Boxes size={12} /> Allowed scope</div>
            <div className="row" style={{ gap: 5, marginTop: 8 }}>
              {t.allowedResources.map((r, i) => <Chip key={i} tone="neutral">{resourceById(r)?.name ?? r}</Chip>)}
            </div>
            <div className="row" style={{ gap: 5, marginTop: 8 }}>
              {t.allowedActions.map((a, i) => <span key={i} className="chip c-neutral chip-mono">{a}</span>)}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label row" style={{ gap: 6 }}><ShieldOff size={12} /> Forbidden</div>
            <div className="row" style={{ gap: 5, marginTop: 8 }}>
              {t.forbidden.map((f, i) => <Chip key={i} tone="block">{resourceById(f)?.name ?? f}</Chip>)}
            </div>
          </div>
        </div>
        <div className="grid g2" style={{ gap: 20, marginTop: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label row" style={{ gap: 6 }}><Timer size={12} /> Time window</div>
            <div className="spread small" style={{ marginTop: 6 }}>
              <span>{t.durationMin} min envelope</span>
              <span className="faint">{finished ? "finished" : `${remaining} min remaining`}</span>
            </div>
            <Meter pct={timePct} done={finished} />
            <div className="small faint" style={{ marginTop: 5 }}>an approval renews it</div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="stat-label row" style={{ gap: 6 }}><FileStack size={12} /> File budget</div>
            <div className="spread small" style={{ marginTop: 6 }}>
              <span>{t.filesUsed} / {t.fileBudget} files changed</span>
              <span className="faint">{Math.round(filePct)}%</span>
            </div>
            <Meter pct={filePct} />
          </div>
        </div>
      </div>

      {(t.grants?.length ?? 0) > 0 && (
        <div className="card" style={{ borderColor: "color-mix(in oklab, var(--accent) 35%, var(--surface))", background: "var(--accent-soft)", marginTop: 16 }}>
          <b className="small">Extra scope approved for this task</b>
          {t.grants!.map((g, i) => (
            <div key={i} className="row small dim" style={{ marginTop: 6, gap: 5 }}>
              <Chip tone="constrain">{resourceById(g.resource)?.name ?? g.resource}</Chip>
              <span>in <b>{g.environment}</b> — scoped grant by</span>
              <Avatar userId={g.grantedBy} size={16} /> <b>{userById(g.grantedBy)?.name ?? g.grantedBy}</b>
              <span className="faint">· valid for this task only</span>
            </div>
          ))}
        </div>
      )}

      {t.status === "stopped" && (
        <div className="card" style={{ borderColor: "var(--bad)", background: "var(--bad-soft)", marginTop: 16 }}>
          <b className="small">Partly done.</b>{" "}
          <span className="small dim">
            {t.steps.filter((x) => x.state === "blocked").length} step(s) were denied or blocked
            {t.steps.some((x) => x.state === "skipped") ? ", and the steps that needed them were skipped" : ""}. Everything that didn't depend on them still finished.
          </span>
        </div>
      )}

      {parked.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", marginTop: 16 }}>
          <div className="row" style={{ gap: 10, alignItems: "flex-start", flexWrap: "nowrap" }}>
            <PauseOctagon size={16} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <b className="small">Safe Continuation active.</b>{" "}
              <span className="small dim">
                Step {parked[0].index + 1} (“{parked[0].label}”) is parked pending approval. Independent safe steps continued.
                Dependent steps wait. Decide in <a onClick={() => nav("reviews")}>Review Center</a>
                {t.approver && <> with <Avatar userId={t.approver} size={15} /> <b>{userById(t.approver)?.name}</b></>} and the task resumes automatically:{" "}
                <b>Approve once</b> allows just this step; <b>Approve scoped</b> also lets this task use that place for the rest of the job.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Execution timeline — the lead visual: steps as a connected pipeline */}
      <div style={{ marginTop: 18 }}>
        <SectionHead title="Execution timeline" sub="Each step evaluated through the Core Brain — click a decided step to inspect its evidence" />
        <StepTimeline steps={t.steps} onOpen={setOpenEvt} />
      </div>

      {hasPending && t.status === "active" && (
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => advanceTask(t.taskId)}>
          <Play size={13} /> Run task steps
        </button>
      )}
      {evt && <EventDetail e={evt} onClose={() => setOpenEvt(null)} onNavigate={(r) => { setOpenEvt(null); nav(r); }} />}
    </div>
  );
}

/** Write a new job from scratch: who asks, who approves, the permission slip (scope,
 *  forbidden, time window, file budget), and the ordered steps. Every field maps
 *  straight onto the same TaskJob shape the four built-in jobs use, so a created
 *  task runs through the identical engine path — startTask() can't tell them apart.
 *  Each step shows its real ALLOW / REVIEW / BLOCK, computed live by the same brain
 *  that will decide it once the task actually runs. */
function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: (jobId: string) => void }) {
  const askers = USERS;
  const agents = AGENTS.filter((a) => !a.discovered);
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState<(typeof TASK_TEAMS)[number]>("Engineering");
  const [agent, setAgent] = useState(agents[0].id);
  const [user, setUser] = useState(askers[0].id);
  const [approver, setApprover] = useState(askers[1]?.id ?? askers[0].id);
  const [environment, setEnvironment] = useState<Environment>("development");
  const [allowedResources, setAllowedResources] = useState<string[]>([]);
  const [allowedActions, setAllowedActions] = useState<ActionVerb[]>(["READ", "WRITE"]);
  const [forbidden, setForbidden] = useState<string[]>(["production"]);
  const [durationMin, setDurationMin] = useState(30);
  const [fileBudget, setFileBudget] = useState(25);
  const [steps, setSteps] = useState<TaskStepDraft[]>([]);
  const [scopeText, setScopeText] = useState("");
  const [forbidText, setForbidText] = useState("");
  const [failed, setFailed] = useState<string | null>(null);

  // One step being composed below the list; cleared on "Add step".
  const [sLabel, setSLabel] = useState("");
  const [sAction, setSAction] = useState<ActionVerb>("READ");
  const [sResource, setSResource] = useState("");
  const [sEnv, setSEnv] = useState<Environment>("development");
  const [sSensitivity, setSSensitivity] = useState<(typeof TASK_SENSITIVITIES)[number]>("internal");
  const [sDeps, setSDeps] = useState<number[]>([]);

  const addChip = (list: string[], setList: (v: string[]) => void, v: string) => {
    const t = v.trim();
    if (t && !list.includes(t)) setList([...list, t]);
  };
  const removeChip = (list: string[], setList: (v: string[]) => void, v: string) => setList(list.filter((x) => x !== v));
  const flipAction = (v: ActionVerb) => setAllowedActions((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));
  const flipDep = (i: number) => setSDeps((l) => (l.includes(i) ? l.filter((x) => x !== i) : [...l, i]));

  const addStep = () => {
    if (!sLabel.trim() || !sResource.trim()) return;
    setSteps([...steps, { label: sLabel.trim(), action: sAction, resource: sResource.trim(), environment: sEnv, sensitivity: sSensitivity, dependsOn: [...sDeps] }]);
    setSLabel(""); setSResource(""); setSDeps([]);
  };
  const removeStep = (i: number) => {
    // Drop the step and renumber any later dependsOn references so the chain stays valid.
    setSteps(steps.filter((_, k) => k !== i).map((s) => ({ ...s, dependsOn: s.dependsOn.filter((d) => d !== i).map((d) => (d > i ? d - 1 : d)) })));
  };

  const draft: TaskJobDraft = { title, team, agent, user, approver, approverRole: userById(approver)?.role ?? "", allowedResources, allowedActions, environment, forbidden, durationMin, fileBudget, steps };
  const error = taskJobError(draft);
  // Only preview once the shape is sound — a half-built draft would just show noise.
  const preview = useMemo(() => (steps.length > 0 && !error ? previewTaskSteps(draft) : []), [JSON.stringify(draft), error]); // eslint-disable-line react-hooks/exhaustive-deps
  const stepError = steps.length === 0 ? null : taskJobError({ ...draft, steps: steps.length >= 2 ? steps : [...steps, steps[0]] });

  const submit = () => {
    const out = createTaskJob(draft);
    if (typeof out === "string") { setFailed(out); return; }
    onCreated(out.id);
  };

  return (
    <Modal onClose={onClose} width={760}>
      <div className="grant task-create">
        <div className="grant-title">Write a new task</div>
        <p className="grant-sub">
          A task is a permission slip for a whole job, not one action: pick the scope, the time window and the file budget once,
          then list the steps in order. Wrapbox checks every step against this same slip while it runs.
        </p>

        <div className="grid g2" style={{ gap: 14 }}>
          <div className="field">
            <label className="field-label">Title</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sync Friday's customer list" />
          </div>
          <div className="field">
            <label className="field-label">Team</label>
            <Select value={team} onChange={(v) => setTeam(v as (typeof TASK_TEAMS)[number])} allLabel={null} options={TASK_TEAMS.map((t) => ({ value: t, label: t }))} />
          </div>
        </div>

        <div className="grid g3" style={{ gap: 14, marginTop: 14 }}>
          <div className="field">
            <label className="field-label">Agent</label>
            <Select value={agent} onChange={setAgent} allLabel={null} options={agents.map((a) => ({ value: a.id, label: a.name }))} />
          </div>
          <div className="field">
            <label className="field-label">Asked by</label>
            <Select value={user} onChange={(v) => { setUser(v); if (v === approver) setApprover(askers.find((u) => u.id !== v)!.id); }} allLabel={null} options={askers.map((u) => ({ value: u.id, label: u.name }))} />
          </div>
          <div className="field">
            <label className="field-label">Approves the risky step</label>
            <Select value={approver} onChange={setApprover} allLabel={null} options={askers.filter((u) => u.id !== user).map((u) => ({ value: u.id, label: `${u.name} (${u.role})` }))} />
          </div>
        </div>
        <span className="small faint">The approver can never be the person who asks — that's what makes the slip mean something.</span>

        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label">Allowed scope — systems and paths every step must stay inside</label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {allowedResources.map((r) => (
              <button key={r} type="button" className="grant-pick on" onClick={() => removeChip(allowedResources, setAllowedResources, r)}>
                <X size={11} />{resourceById(r)?.name ?? r}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <input className="input" style={{ flex: 1 }} value={scopeText} onChange={(e) => setScopeText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(allowedResources, setAllowedResources, scopeText); setScopeText(""); } }}
              placeholder="type a path or system, press Enter — e.g. src/ or checkout-service" />
            <button className="btn btn-sm" onClick={() => { addChip(allowedResources, setAllowedResources, scopeText); setScopeText(""); }}><Plus size={12} /> Add</button>
          </div>
          <div className="row" style={{ gap: 5, marginTop: 7, flexWrap: "wrap" }}>
            {[...TASK_RESOURCES.map((r) => r.id), ...SCOPE_PRESETS].filter((v) => !allowedResources.includes(v)).slice(0, 9).map((v) => (
              <button key={v} type="button" className="grant-pick" onClick={() => addChip(allowedResources, setAllowedResources, v)}>{resourceById(v)?.name ?? v}</button>
            ))}
          </div>
        </div>

        <div className="grid g2" style={{ gap: 14, marginTop: 14 }}>
          <div className="field">
            <label className="field-label">May</label>
            <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
              {TASK_STEP_ACTIONS.map((v) => (
                <button key={v} type="button" aria-pressed={allowedActions.includes(v)} className={`grant-pick${allowedActions.includes(v) ? " on" : ""}`} onClick={() => flipAction(v)}>
                  {allowedActions.includes(v) && <Check size={11} />}{v}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Home environment</label>
            <Select value={environment} onChange={(v) => setEnvironment(v as Environment)} allLabel={null} options={TASK_ENVIRONMENTS.map((e) => ({ value: e, label: e }))} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label">Forbidden — any step touching these needs a yes from the approver</label>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {forbidden.map((f) => (
              <button key={f} type="button" className="grant-pick deny on" onClick={() => removeChip(forbidden, setForbidden, f)}><X size={11} />{f}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <input className="input" style={{ flex: 1 }} value={forbidText} onChange={(e) => setForbidText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChip(forbidden, setForbidden, forbidText); setForbidText(""); } }}
              placeholder="type something and press Enter — e.g. .env or credentials" />
            <button className="btn btn-sm" onClick={() => { addChip(forbidden, setForbidden, forbidText); setForbidText(""); }}><Plus size={12} /> Add</button>
          </div>
          <div className="row" style={{ gap: 5, marginTop: 7 }}>
            {FORBIDDEN_PRESETS.filter((v) => !forbidden.includes(v)).map((v) => (
              <button key={v} type="button" className="grant-pick" onClick={() => addChip(forbidden, setForbidden, v)}>{v}</button>
            ))}
          </div>
        </div>

        <div className="grant-row" style={{ marginTop: 14 }}>
          <div className="field" style={{ width: 170 }}>
            <label className="field-label">Time window</label>
            <input className="input" type="number" min={5} max={180} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
            <span className="small faint">minutes — the whole job must finish inside this</span>
          </div>
          <div className="field" style={{ width: 170 }}>
            <label className="field-label">File budget</label>
            <input className="input" type="number" min={1} max={200} value={fileBudget} onChange={(e) => setFileBudget(Number(e.target.value))} />
            <span className="small faint">files changed, across every step combined</span>
          </div>
        </div>

        {/* ---- Steps ---- */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
          <div className="field-label" style={{ marginBottom: 8 }}>Steps, in order ({steps.length})</div>

          {steps.length > 0 && (
            <div className="task-step-list">
              {steps.map((s, i) => {
                const p = preview[i];
                return (
                  <div key={i} className="task-step-item">
                    <span className="task-step-n">{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <b>{s.label}</b>
                        <span className="chip c-neutral chip-mono">{s.action}</span>
                        <span className="small dim">{s.resource}</span>
                        <span className="small faint">· {s.environment}</span>
                      </div>
                      {s.dependsOn.length > 0 && <div className="small faint" style={{ marginTop: 2 }}>after step{s.dependsOn.length > 1 ? "s" : ""} {s.dependsOn.map((d) => d + 1).join(", ")}</div>}
                    </div>
                    {p && <DecisionChip d={p.decision} small />}
                    <button className="btn btn-sm btn-ghost" onClick={() => removeStep(i)} aria-label="Remove step"><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="task-step-add">
            <div className="grid g2" style={{ gap: 10 }}>
              <input className="input" value={sLabel} onChange={(e) => setSLabel(e.target.value)} placeholder="Step label — e.g. Patch rounding bug" />
              <input className="input" value={sResource} onChange={(e) => setSResource(e.target.value)} placeholder="Resource — e.g. src/checkout.ts" list="task-scope-hints" />
              <datalist id="task-scope-hints">{allowedResources.map((r) => <option key={r} value={r} />)}</datalist>
            </div>
            <div className="grid g4" style={{ gap: 10, marginTop: 10 }}>
              <Select value={sAction} onChange={(v) => setSAction(v as ActionVerb)} allLabel={null} options={(allowedActions.length ? allowedActions : TASK_STEP_ACTIONS).map((a) => ({ value: a, label: a }))} />
              <Select value={sEnv} onChange={(v) => setSEnv(v as Environment)} allLabel={null} options={TASK_ENVIRONMENTS.map((e) => ({ value: e, label: e }))} />
              <Select value={sSensitivity} onChange={(v) => setSSensitivity(v as (typeof TASK_SENSITIVITIES)[number])} allLabel={null} options={TASK_SENSITIVITIES.map((s) => ({ value: s, label: s }))} />
              <button className="btn btn-sm" disabled={!sLabel.trim() || !sResource.trim()} onClick={addStep}><Plus size={12} /> Add step</button>
            </div>
            {steps.length > 0 && (
              <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span className="small faint">Runs after:</span>
                {steps.map((s, i) => (
                  <button key={i} type="button" aria-pressed={sDeps.includes(i)} className={`grant-pick${sDeps.includes(i) ? " on" : ""}`} onClick={() => flipDep(i)}>
                    {sDeps.includes(i) && <Check size={11} />}{i + 1}. {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {stepError && steps.length > 0 && <div className="small" style={{ color: "var(--block)", marginTop: 8 }}>{stepError}</div>}
        </div>

        {failed && <div className="small" style={{ color: "var(--block)", marginTop: 10 }}>{failed}</div>}
        <div className="grant-foot">
          <span className="small faint">Every step runs through the same engine the four built-in jobs use.</span>
          <span className="row" style={{ gap: 8, marginLeft: "auto" }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!!error} onClick={submit}><Check size={13} /> Create task</button>
          </span>
        </div>
      </div>
    </Modal>
  );
}

/** The console's action surface — the built-in jobs plus any this admin has written,
 *  each with its slip + separate approver. Renders without a section wrapper so it
 *  can sit directly inside a tab panel. */
function Launcher({ jobs, newJobId, run, busyMorning, onCreate }: {
  jobs: typeof TASK_JOBS; newJobId: string | null; run: (jobId?: string) => void; busyMorning: () => void; onCreate?: () => void;
}) {
  return (
    <>
      <SectionHead
        title="Start a task"
        sub="Each agent gets its job's permission slip; its risky step goes to a different person to approve."
        right={
          <span className="row" style={{ gap: 8 }}>
            {DESKTOP_SHELL && onCreate && <button className="btn btn-sm" onClick={onCreate}><Plus size={13} /> Write a new task</button>}
            <button className="btn btn-primary btn-sm" onClick={busyMorning}><Sunrise size={13} /> Busy morning — start all {jobs.length}</button>
          </span>
        }
      />
      <CardGrid>
        {jobs.map((j) => (
          <EntityCard
            key={j.id}
            icon={<AgentMark agentId={j.agent} size={26} />}
            eyebrow={j.id === newJobId ? "Just created" : j.team}
            title={j.title}
            selected={j.id === newJobId}
            action={<button className="btn btn-sm" onClick={() => run(j.id)}><Play size={13} /> Start</button>}
            fields={[
              { label: "Agent", value: <><AgentMark agentId={j.agent} size={15} /> {agentById(j.agent)?.name}</> },
              { label: "Asked by", value: <><Avatar userId={j.user} size={16} />{userById(j.user)?.name} <span className="faint">({userById(j.user)?.role})</span></> },
              { label: "Approver", value: <><Avatar userId={j.approver} size={16} />{userById(j.approver)?.name} <span className="faint">({j.approverRole})</span></> },
              { label: "Envelope", value: `${j.envelope.name} · ${j.envelope.durationMin} min` },
              { label: "Needs a yes", value: j.envelope.forbidden.map((f, i) => <Chip key={i} tone="block">{resourceById(f)?.name ?? f}</Chip>) },
            ]}
          />
        ))}
      </CardGrid>
    </>
  );
}

/** Status label for filtering — the same wording TaskStatusChip shows. */
const statusLabel = (t: TaskEnvelope) => (t.status === "stopped" ? "PARTLY DONE" : t.status.toUpperCase());

/** Master list + detail: filterable EntityCard grid; the full panel renders below for the selected task. */
function TaskBrowser({ list, total, title, sub, emptyLine, inProgress, pickedId, onPick, nav }: {
  list: TaskEnvelope[];
  total: number;
  title: string;
  sub: string;
  emptyLine: string;
  inProgress: boolean;
  pickedId?: string;
  onPick: (taskId: string) => void;
  nav: (r: string) => void;
}) {
  const f = useCardFilters(list, {
    search: (t) => `${t.title} ${t.team ?? ""} ${agentById(t.agent)?.name ?? ""} ${userById(t.user)?.name ?? ""}`,
    filters: [
      { id: "team", label: "Team", get: (t) => t.team ?? "Engineering" },
      { id: "status", label: "Status", get: statusLabel },
      { id: "agent", label: "Agent", get: (t) => t.agent, format: (v) => agentById(v)?.name ?? v },
    ],
  });
  const pg = usePaged(f.filtered, 8, f.resetKey);
  const current = f.filtered.find((t) => t.taskId === pickedId) ?? f.filtered[0];

  return (
    <>
      <SectionHead title={title} sub={sub} />
      {list.length === 0 ? (
        <div className="card empty">
          <Boxes size={26} className="dim" />
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>
            No tasks {inProgress ? "in progress" : "finished yet"}
          </div>
          <div className="small dim" style={{ maxWidth: 520, margin: "8px auto 0", lineHeight: 1.55 }}>
            {emptyLine} Start one from the <b>Start a task</b> tab — or press <b>Busy morning</b> there to see all four teams working at once.
          </div>
        </div>
      ) : (
        <>
          <FilterBar {...f.bar} placeholder="Search task, team, agent, person…" />
          {f.filtered.length === 0 ? (
            <div className="card empty">No tasks match the current filters ({total} in this tab).</div>
          ) : (
            <>
              <CardGrid>
                {pg.rows.map((t) => {
                  const done = t.steps.filter((x) => x.state === "done").length;
                  return (
                    <EntityCard
                      key={t.taskId}
                      icon={<AgentMark agentId={t.agent} size={26} />}
                      eyebrow={t.team ?? "Engineering"}
                      title={t.title}
                      status={<TaskStatusChip t={t} />}
                      selected={t.taskId === current?.taskId}
                      onClick={() => onPick(t.taskId)}
                      fields={[
                        {
                          label: "Asked by → Approver",
                          value: (
                            <>
                              <Avatar userId={t.user} size={16} />{userById(t.user)?.name ?? t.user}
                              <ArrowRight size={12} className="faint" />
                              {t.approver ? <><Avatar userId={t.approver} size={16} />{userById(t.approver)?.name ?? t.approver}</> : <span className="faint">—</span>}
                            </>
                          ),
                        },
                        { label: "Steps", value: <span className="tnum">{done} / {t.steps.length} done</span> },
                        { label: "Envelope", value: `${t.templateName ?? "Task envelope"} · ${t.durationMin} min` },
                      ]}
                    />
                  );
                })}
              </CardGrid>
              <Pager page={pg.page} pages={pg.pages} setPage={pg.setPage} total={pg.total} size={pg.size} />
              {current && (
                <div style={{ marginTop: 16 }}>
                  <EnvelopeCard key={current.taskId} t={current} nav={nav} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}

export function TasksPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const active = s.tasks.filter((t) => t.status === "active").length;
  const completed = s.tasks.filter((t) => t.status === "completed").length;
  const parkedTasks = s.tasks.filter((t) => t.steps.some((x) => x.state === "parked")).length;
  const stopped = s.tasks.filter((t) => t.status === "stopped").length;
  const jobs = [...TASK_JOBS, ...s.customJobs];
  const run = (jobId?: string) => { const t = startTask(jobId); advanceTask(t.taskId); };
  const busyMorning = () => jobs.forEach((j) => run(j.id));

  // Status split for the tabs; filters (team, status, agent) narrow the list inside a tab.
  const newestFirst = [...s.tasks].reverse();
  const inProgressAll = newestFirst.filter(isInProgress);
  const finishedAll = newestFirst.filter((t) => !isInProgress(t));
  const latest = s.tasks[s.tasks.length - 1];

  // Master/detail selection — remembered per tab; falls back to the newest task in the list.
  const [picked, setPicked] = useState<{ progress?: string; finished?: string }>({});
  const [creating, setCreating] = useState(false);
  const [newJobId, setNewJobId] = useState<string | null>(null);

  const browse = (key: "progress" | "finished", list: TaskEnvelope[], title: string, sub: string, emptyLine: string) => (
    <TaskBrowser
      list={list}
      total={list.length}
      title={title}
      sub={sub}
      emptyLine={emptyLine}
      inProgress={key === "progress"}
      pickedId={picked[key]}
      onPick={(id) => setPicked((p) => ({ ...p, [key]: id }))}
      nav={nav}
    />
  );

  return (
    <div className="page">
      <PageHead
        eyebrow="Activity"
        title="Tasks"
        sub="Every task gets a short-lived, least-privilege scope: allowed resources, forbidden paths, a time window and a file budget — authority that expires when the task ends. If a step needs a human, it parks while safe work continues."
        right={<SimNote>Task execution simulated through the real decision engine</SimNote>}
      />

      {s.tasks.length === 0 ? (
        <>
          <div className="section">
            <Launcher jobs={jobs} newJobId={newJobId} run={run} busyMorning={busyMorning} onCreate={() => setCreating(true)} />
          </div>
          <div className="card empty" style={{ marginTop: 24 }}>
            <Boxes size={26} className="dim" />
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No tasks yet</div>
            <div className="small dim" style={{ maxWidth: 520, margin: "8px auto 0", lineHeight: 1.55 }}>
              Start one of the jobs above, write your own with <b>Write a new task</b>, or press <b>Busy morning</b> to see every team working at once.
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <MetricBar
              band
              items={[
                { label: "Task envelopes", value: s.tasks.length, note: "short-lived, scoped runs" },
                { label: "Active", value: active, tone: active > 0 ? "info" : undefined, note: "currently executing" },
                { label: "Parked", value: parkedTasks, tone: parkedTasks > 0 ? "warn" : "good", note: "awaiting approval to resume", onClick: () => nav("reviews") },
                { label: "Completed", value: completed, tone: completed > 0 ? "good" : undefined, note: stopped ? `${stopped} stopped after a denial` : "finished within envelope" },
              ]}
            />
          </div>

          <PageTabs
            storageKey="tasks"
            tabs={[
              {
                id: "progress",
                label: "In progress",
                count: inProgressAll.length,
                content: browse(
                  "progress", inProgressAll, "In progress",
                  "Running or parked for approval, newest first — select a task to see its envelope and execution timeline",
                  "Tasks appear here while they run or wait on an approval.",
                ),
              },
              {
                id: "finished",
                label: "Finished",
                count: finishedAll.length,
                content: browse(
                  "finished", finishedAll, "Finished",
                  "Completed, or partly done after a denial — click any decided step to inspect its event",
                  "Tasks land here once they complete, or stop after a denial.",
                ),
              },
              {
                id: "start",
                label: "Start a task",
                content: (
                  <>
                    {latest && (
                      <div className="card" style={{ padding: "11px 16px", marginBottom: 18 }}>
                        <div className="row small" style={{ gap: 8 }}>
                          <span className="faint">Latest run</span>
                          <AgentMark agentId={latest.agent} size={16} />
                          <b>{latest.title}</b>
                          <TaskStatusChip t={latest} />
                          <span className="dim">— follow it in the <b>{isInProgress(latest) ? "In progress" : "Finished"}</b> tab</span>
                        </div>
                      </div>
                    )}
                    <Launcher jobs={jobs} newJobId={newJobId} run={run} busyMorning={busyMorning} onCreate={() => setCreating(true)} />
                  </>
                ),
              },
            ]}
          />
        </>
      )}
      {creating && (
        <CreateTaskModal
          onClose={() => setCreating(false)}
          onCreated={(jobId) => { setCreating(false); setNewJobId(jobId); }}
        />
      )}
    </div>
  );
}
