// Tasks — Task Envelope visualization + Safe Continuation (park/resume).
// The 10-step "Fix checkout and deploy" workflow runs through the real brain:
// step 6 (production deploy) parks; independent steps continue; approval resumes.
import { useAppState, startTask, advanceTask } from "../state/store";
import { TASK_JOBS } from "../engine/scenarios";
import { PageHead, SectionHead, Stat, Chip, DecisionChip, SimNote, AgentMark, Avatar } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import { useState } from "react";
import { agentById, resourceById, userById } from "../model/org";
import type { TaskEnvelope } from "../model/types";
import { Boxes, Activity, PauseCircle, CheckCircle2, ShieldOff, Timer, FileStack, Play, PauseOctagon, Sunrise } from "lucide-react";

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

function EnvelopeCard({ t, nav }: { t: TaskEnvelope; nav: (r: string) => void }) {
  const s = useAppState();
  const [openEvt, setOpenEvt] = useState<string | null>(null);
  const evt = openEvt ? s.events.find((e) => e.id === openEvt) : null;
  const elapsed = Math.round((Date.now() - t.startedAt) / 60000);
  const remaining = Math.max(0, t.durationMin - elapsed);
  const parked = t.steps.filter((x) => x.state === "parked");
  const hasPending = t.steps.some((x) => x.state === "pending");

  return (
    <div className="card">
      <div className="spread">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>“{t.title}”</div>
          <div className="small dim" style={{ marginTop: 3 }}>
            {agentById(t.agent)?.name} · asked by {userById(t.user)?.name}
            {t.approver && <> · risky steps go to <b>{userById(t.approver)?.name}</b> ({t.approverRole})</>}
            {t.templateName && <> · slip: {t.templateName}</>}
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {t.team && <Chip tone="neutral">{t.team}</Chip>}
          <Chip tone={t.status === "completed" ? "allow" : t.status === "parked" ? "review" : t.status === "stopped" ? "block" : "constrain"}>
            {t.status === "stopped" ? "PARTLY DONE" : t.status.toUpperCase()}
          </Chip>
        </div>
      </div>

      <div className="grid g4" style={{ marginTop: 18 }}>
        <div>
          <div className="stat-label row" style={{ gap: 6 }}><Boxes size={13} /> Allowed scope</div>
          <div className="small" style={{ marginTop: 4 }}>{t.allowedResources.map((r) => resourceById(r)?.name ?? r).join(", ")}</div>
          <div className="small faint">{t.allowedActions.join(" · ")}</div>
        </div>
        <div>
          <div className="stat-label row" style={{ gap: 6 }}><ShieldOff size={13} /> Forbidden</div>
          <div className="small" style={{ marginTop: 4, color: "var(--bad)" }}>{t.forbidden.map((f) => resourceById(f)?.name ?? f).join(", ")}</div>
        </div>
        <div>
          <div className="stat-label row" style={{ gap: 6 }}><Timer size={13} /> Time window</div>
          <div className="small" style={{ marginTop: 4 }}>
            {t.durationMin} min · {t.status === "completed" || t.status === "stopped" ? "finished" : `${remaining} min remaining`}
          </div>
          <div className="small faint">an approval renews it</div>
        </div>
        <div>
          <div className="stat-label row" style={{ gap: 6 }}><FileStack size={13} /> File budget</div>
          <div className="small" style={{ marginTop: 4 }}>{t.filesUsed} / {t.fileBudget} files changed</div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 6 }}>
            <div style={{ height: "100%", width: `${Math.min(100, (t.filesUsed / t.fileBudget) * 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {(t.grants?.length ?? 0) > 0 && (
        <div className="card" style={{ borderColor: "color-mix(in oklab, var(--accent) 35%, white)", background: "var(--accent-soft)", marginTop: 16 }}>
          <b className="small">Extra scope approved for this task</b>
          {t.grants!.map((g, i) => (
            <div key={i} className="small dim" style={{ marginTop: 4 }}>
              {resourceById(g.resource)?.name ?? g.resource} in <b>{g.environment}</b> — approved (scoped) by {userById(g.grantedBy)?.name ?? g.grantedBy}. Valid for this task only.
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
          <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
            <PauseOctagon size={16} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <b className="small">Safe Continuation active.</b>{" "}
              <span className="small dim">
                Step {parked[0].index + 1} (“{parked[0].label}”) is parked pending approval. Independent safe steps continued.
                Dependent steps wait. Decide in <a onClick={() => nav("reviews")}>Review Center</a> and the task resumes automatically:{" "}
                <b>Approve once</b> allows just this step; <b>Approve scoped</b> also lets this task use that place for the rest of the job.
              </span>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <SectionHead title="Execution timeline" sub="Each step evaluated through the Core Brain, newest state shown" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th style={{ width: 30 }}>#</th><th>Step</th><th>Action</th><th>Depends on</th><th>Decision</th><th>State</th></tr></thead>
            <tbody>
              {t.steps.map((st) => (
                <tr key={st.index} className={st.eventId ? "rowlink" : undefined} onClick={() => st.eventId && setOpenEvt(st.eventId)}>
                  <td className="mono faint">{st.index + 1}</td>
                  <td>{st.label}</td>
                  <td className="mono small dim">{st.action} · {resourceById(st.resource)?.name ?? st.resource}</td>
                  <td className="small faint">{st.dependsOn.length ? st.dependsOn.map((d) => d + 1).join(", ") : "—"}</td>
                  <td>{st.decision ? <DecisionChip d={st.decision} small /> : <span className="faint">—</span>}</td>
                  <td><StepState s={st.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      <div className="section" style={{ marginTop: 0 }}>
        <SectionHead
          title="Start a task"
          sub="Four real jobs from four teams. Each agent gets its team's permission slip; its risky step goes to a different person to approve."
          right={<button className="btn btn-primary btn-sm" onClick={busyMorning}><Sunrise size={13} /> Busy morning — start all 4</button>}
        />
        <div className="grid g2">
          {TASK_JOBS.map((j) => (
            <div className="card" key={j.id}>
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <div className="row" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <AgentMark agentId={j.agent} size={22} />
                  <div>
                    <div className="eyebrow">{j.team}</div>
                    <b>“{j.title}”</b>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => run(j.id)}><Play size={13} /> Start</button>
              </div>
              <dl className="clause-facts" style={{ gridTemplateColumns: "92px 1fr" }}>
                <dt>Agent</dt><dd>{agentById(j.agent)?.name}</dd>
                <dt>Asked by</dt><dd className="row" style={{ gap: 6 }}><Avatar userId={j.user} size={16} />{userById(j.user)?.name} <span className="faint">({userById(j.user)?.role})</span></dd>
                <dt>Slip</dt><dd>{j.envelope.name} · {j.envelope.durationMin} min · never: {j.envelope.forbidden.map((f) => resourceById(f)?.name ?? f).join(", ")}</dd>
                <dt>Approver</dt><dd className="row" style={{ gap: 6 }}><Avatar userId={j.approver} size={16} />{userById(j.approver)?.name} <span className="faint">({j.approverRole})</span></dd>
              </dl>
            </div>
          ))}
        </div>
      </div>

      {s.tasks.length === 0 ? (
        <div className="empty">
          <Boxes size={26} className="dim" />
          <div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No tasks yet</div>
          <div className="small dim" style={{ maxWidth: 520, margin: "8px auto 0", lineHeight: 1.55 }}>
            Start one of the jobs above — or press <b>Busy morning</b> to see all four teams working at once.
          </div>
        </div>
      ) : (
        <>
          <div className="grid g4">
            <Stat icon={<Boxes size={17} />} label="Task envelopes" value={s.tasks.length} note="short-lived, scoped runs" />
            <Stat icon={<Activity size={17} />} label="Active" value={active} tone={active > 0 ? "info" : undefined} note="currently executing" />
            <Stat icon={<PauseCircle size={17} />} label="Parked" value={parkedTasks} tone={parkedTasks > 0 ? "warn" : "good"} note="awaiting approval to resume" onClick={() => nav("reviews")} />
            <Stat icon={<CheckCircle2 size={17} />} label="Completed" value={completed} tone={completed > 0 ? "good" : undefined} note={stopped ? `${stopped} stopped after a denial` : "finished within envelope"} />
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
        </>
      )}
    </div>
  );
}
