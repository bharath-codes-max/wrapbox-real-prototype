// Tasks — Task Envelope visualization + Safe Continuation (park/resume).
// The 10-step "Fix checkout and deploy" workflow runs through the real brain:
// step 6 (production deploy) parks; independent steps continue; approval resumes.
import { useAppState, startTask, advanceTask } from "../state/store";
import { PageHead, Chip, DecisionChip, SimNote } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import { useState } from "react";
import { agentById, userById } from "../model/org";
import type { TaskEnvelope } from "../model/types";

function StepState({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    pending: ["neutral", "pending"],
    running: ["constrain", "running"],
    done: ["allow", "done"],
    parked: ["review", "PARKED"],
    blocked: ["block", "blocked"],
    waiting_dependency: ["neutral", "waiting on dependency"],
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
        <div>
          <b>“{t.title}”</b>
          <div className="small dim">
            {agentById(t.agent)?.name} · requested by {userById(t.user)?.name} · envelope {t.taskId}
          </div>
        </div>
        <Chip tone={t.status === "completed" ? "allow" : t.status === "parked" ? "review" : "constrain"}>{t.status.toUpperCase()}</Chip>
      </div>

      <div className="grid g4" style={{ margin: "12px 0" }}>
        <div>
          <div className="stat-label">Allowed scope</div>
          <div className="small">{t.allowedResources.slice(0, 4).join(", ")}</div>
          <div className="small faint">{t.allowedActions.join(" · ")}</div>
        </div>
        <div>
          <div className="stat-label">Forbidden</div>
          <div className="small" style={{ color: "var(--bad)" }}>{t.forbidden.join(", ")}</div>
        </div>
        <div>
          <div className="stat-label">Time window</div>
          <div className="small">{t.durationMin} min · {remaining} min remaining</div>
        </div>
        <div>
          <div className="stat-label">File budget</div>
          <div className="small">{t.filesUsed} / {t.fileBudget} files changed</div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 2, marginTop: 4 }}>
            <div style={{ height: "100%", width: `${Math.min(100, (t.filesUsed / t.fileBudget) * 100)}%`, background: "var(--accent)", borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {parked.length > 0 && (
        <div className="card" style={{ borderColor: "var(--warn)", background: "var(--warn-soft)", marginBottom: 10 }}>
          <b className="small">Safe Continuation active.</b>{" "}
          <span className="small dim">
            Step {parked[0].index + 1} (“{parked[0].label}”) is parked pending approval. Independent safe steps continued.
            Dependent steps wait. Approve it in <a onClick={() => nav("reviews")}>Review Center</a> — the task resumes automatically.
          </span>
        </div>
      )}

      <table className="tbl">
        <thead><tr><th style={{ width: 30 }}>#</th><th>Step</th><th>Action</th><th>Depends on</th><th>Decision</th><th>State</th></tr></thead>
        <tbody>
          {t.steps.map((st) => (
            <tr key={st.index} className={st.eventId ? "rowlink" : undefined} onClick={() => st.eventId && setOpenEvt(st.eventId)}>
              <td className="mono faint">{st.index + 1}</td>
              <td>{st.label}</td>
              <td className="mono small dim">{st.action} · {st.resource}</td>
              <td className="small faint">{st.dependsOn.length ? st.dependsOn.map((d) => d + 1).join(", ") : "—"}</td>
              <td>{st.decision ? <DecisionChip d={st.decision} small /> : <span className="faint">—</span>}</td>
              <td><StepState s={st.state} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasPending && t.status === "active" && (
        <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={() => advanceTask(t.taskId)}>
          Run task steps
        </button>
      )}
      {evt && <EventDetail e={evt} onClose={() => setOpenEvt(null)} onNavigate={(r) => { setOpenEvt(null); nav(r); }} />}
    </div>
  );
}

export function TasksPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  return (
    <div className="page">
      <PageHead
        title="Tasks"
        sub="Each agent task runs inside a short-lived Task Envelope: allowed scope, forbidden scope, time window and file budget. Unsafe steps park; safe work continues."
        right={<SimNote>Task execution simulated through the real decision engine</SimNote>}
      />
      {s.tasks.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ marginBottom: 8 }}>No active tasks.</div>
          <div className="small dim" style={{ marginBottom: 14, maxWidth: 520, margin: "0 auto 14px" }}>
            Start the demonstration workflow: Daniel asks Claude Code to “Fix checkout and deploy.”
            Ten steps run through the Core Brain — the production deploy (step 6) will require approval and park,
            while independent steps continue.
          </div>
          <button className="btn btn-primary" onClick={() => { const t = startTask(); advanceTask(t.taskId); }}>
            ▶ Start “Fix checkout and deploy”
          </button>
        </div>
      )}
      {[...s.tasks].reverse().map((t) => <EnvelopeCard key={t.taskId} t={t} nav={nav} />)}
    </div>
  );
}
