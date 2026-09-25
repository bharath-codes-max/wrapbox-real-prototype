// Tasks — Task Envelope visualization + Safe Continuation (park/resume).
// The 10-step "Fix checkout and deploy" workflow runs through the real brain:
// step 6 (production deploy) parks; independent steps continue; approval resumes.
import { useAppState, startTask, advanceTask } from "../state/store";
import { TASK_JOBS } from "../engine/scenarios";
import { PageHead, SectionHead, MetricBar, Chip, DecisionChip, SimNote, AgentMark, Avatar } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import { useState } from "react";
import { agentById, resourceById, userById } from "../model/org";
import type { TaskEnvelope } from "../model/types";
import { Boxes, ShieldOff, Timer, FileStack, Play, PauseOctagon, Sunrise } from "lucide-react";

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
function Meter({ pct, tone = "accent" }: { pct: number; tone?: string }) {
  return (
    <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 999, marginTop: 7, overflow: "hidden", boxShadow: "inset 0 0 0 1px var(--line)" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: `var(--${tone})`, borderRadius: 999 }} />
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
          <Chip tone={t.status === "completed" ? "allow" : t.status === "parked" ? "review" : t.status === "stopped" ? "block" : "constrain"}>
            {t.status === "stopped" ? "PARTLY DONE" : t.status.toUpperCase()}
          </Chip>
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
            <Meter pct={timePct} />
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

/** The console's action surface — four real team jobs, each with its slip + separate approver. */
function Launcher({ run, busyMorning }: { run: (jobId?: string) => void; busyMorning: () => void }) {
  return (
    <div className="section">
      <SectionHead
        title="Start a task"
        sub="Four real jobs from four teams. Each agent gets its team's permission slip; its risky step goes to a different person to approve."
        right={<button className="btn btn-primary btn-sm" onClick={busyMorning}><Sunrise size={13} /> Busy morning — start all 4</button>}
      />
      <div className="grid g2">
        {TASK_JOBS.map((j) => (
          <div className="card" key={j.id}>
            <div className="spread" style={{ alignItems: "flex-start" }}>
              <div className="row" style={{ gap: 11, flexWrap: "nowrap", alignItems: "flex-start", minWidth: 0 }}>
                <AgentMark agentId={j.agent} size={26} />
                <div style={{ minWidth: 0 }}>
                  <div className="eyebrow">{j.team}</div>
                  <b style={{ fontSize: 14.5 }}>{j.title}</b>
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => run(j.id)}><Play size={13} /> Start</button>
            </div>
            <dl className="clause-facts" style={{ gridTemplateColumns: "92px 1fr", marginTop: 14 }}>
              <dt>Agent</dt><dd className="row" style={{ gap: 6 }}><AgentMark agentId={j.agent} size={15} /> {agentById(j.agent)?.name}</dd>
              <dt>Asked by</dt><dd className="row" style={{ gap: 6 }}><Avatar userId={j.user} size={16} />{userById(j.user)?.name} <span className="faint">({userById(j.user)?.role})</span></dd>
              <dt>Approver</dt><dd className="row" style={{ gap: 6 }}><Avatar userId={j.approver} size={16} />{userById(j.approver)?.name} <span className="faint">({j.approverRole})</span></dd>
              <dt>Envelope</dt><dd>{j.envelope.name} · {j.envelope.durationMin} min</dd>
              <dt>Never</dt><dd className="row" style={{ gap: 5 }}>{j.envelope.forbidden.map((f, i) => <Chip key={i} tone="block">{resourceById(f)?.name ?? f}</Chip>)}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const active = s.tasks.filter((t) => t.status === "active").length;
  const completed = s.tasks.filter((t) => t.status === "completed").length;
  const parkedTasks = s.tasks.filter((t) => t.steps.some((x) => x.state === "parked")).length;
  const stopped = s.tasks.filter((t) => t.status === "stopped").length;
  const run = (jobId?: string) => { const t = startTask(jobId); advanceTask(t.taskId); };
  const busyMorning = () => TASK_JOBS.forEach((j) => run(j.id));
  const [teamFilter, setTeamFilter] = useState<string>("");
  const shown = [...s.tasks].reverse().filter((t) => !teamFilter || (t.team ?? "Engineering") === teamFilter);

  return (
    <div className="page">
      <PageHead
        eyebrow="Activity"
        title="Tasks"
        sub="Each agent task runs inside a short-lived Task Envelope: allowed scope, forbidden scope, time window and file budget. Unsafe steps park; safe work continues."
        right={<SimNote>Task execution simulated through the real decision engine</SimNote>}
      />

      {s.tasks.length === 0 ? (
        <>
          <Launcher run={run} busyMorning={busyMorning} />
          <div className="card empty" style={{ marginTop: 24 }}>
            <Boxes size={26} className="dim" />
            <div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No tasks yet</div>
            <div className="small dim" style={{ maxWidth: 520, margin: "8px auto 0", lineHeight: 1.55 }}>
              Start one of the jobs above — or press <b>Busy morning</b> to see all four teams working at once.
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

          <div className="section">
            <SectionHead
              title="Running and finished tasks"
              sub="Newest first — click any step with a recorded decision to inspect its event"
              right={
                <div className="row" style={{ gap: 4 }}>
                  {["", ...TASK_JOBS.map((j) => j.team)].map((tm) => (
                    <button key={tm || "all"} className={`btn btn-sm ${teamFilter === tm ? "btn-primary" : "btn-ghost"}`} onClick={() => setTeamFilter(tm)}>
                      {tm || "All teams"}
                    </button>
                  ))}
                </div>
              }
            />
            {shown.map((t) => <EnvelopeCard key={t.taskId} t={t} nav={nav} />)}
            {shown.length === 0 && <div className="card empty">No {teamFilter} tasks yet.</div>}
          </div>

          <Launcher run={run} busyMorning={busyMorning} />
        </>
      )}
    </div>
  );
}
