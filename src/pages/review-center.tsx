// Review Center — only exceptional items; impact, blast radius, safer
// alternative, expiry, requester separation, transaction bundling.
import { useState } from "react";
import { useAppState, resolveReview } from "../state/store";
import { PageHead, SectionHead, Stat, DecisionChip, Chip, RiskChip, SimNote, names, timeAgo, StatusChip } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import type { SimulationEvent } from "../model/types";
import { Hand, Layers, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

export function ReviewCenter({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [open, setOpen] = useState<SimulationEvent | null>(null);
  const pending = s.events.filter((e) => e.reviewState?.status === "pending").sort((a, b) => b.timestamp - a.timestamp);
  const resolved = s.events.filter((e) => e.reviewState && e.reviewState.status !== "pending").sort((a, b) => (b.reviewState?.decidedAt ?? 0) - (a.reviewState?.decidedAt ?? 0));

  // Transaction bundling: group pending items from the same agent + task.
  const bundles = new Map<string, SimulationEvent[]>();
  for (const e of pending) {
    const key = e.taskId ?? `${e.agent}-single-${e.id}`;
    bundles.set(key, [...(bundles.get(key) ?? []), e]);
  }

  const approved = resolved.filter((e) => e.reviewState!.status.startsWith("approved")).length;
  const constrained = resolved.filter((e) => e.reviewState!.status === "constrained").length;
  const denied = resolved.filter((e) => e.reviewState!.status === "denied").length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Review Center"
        sub="Humans review exceptions, not every action. Related actions arrive as one coherent bundle with purpose, blast radius, risk, expiry and a safer alternative. Requester and approver are separated."
        right={<SimNote>Approver: Alex Morgan (Engineering Manager)</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Hand size={17} />} label="Awaiting review" value={pending.length} tone={pending.length > 0 ? "warn" : "good"} note="exceptions escalated to a human" />
        <Stat icon={<Layers size={17} />} label="Bundles" value={bundles.size} note="related actions grouped as one decision" />
        <Stat icon={<CheckCircle2 size={17} />} label="Approved" value={approved} tone="good" note={constrained > 0 ? `${constrained} constrained to a safer path` : "per-action, never widened later"} />
        <Stat icon={<XCircle size={17} />} label="Denied" value={denied} tone={denied > 0 ? "bad" : undefined} note="stays denied; no silent retry" />
      </div>

      <div className="section">
        <SectionHead
          title="Awaiting your decision"
          sub="Each bundle shows purpose, blast radius, risk, expiry and a safer alternative before you act"
        />

        {pending.length === 0 ? (
          <div className="card empty">
            Nothing waiting for review. Normal safe work auto-allows; transformable work auto-constrains.
            Generate exceptions from the <a onClick={() => nav("simlab")}>Simulation Lab</a> or <a onClick={() => nav("tasks")}>Tasks</a>.
          </div>
        ) : (
          <div className="grid" style={{ gap: 16 }}>
            {[...bundles.entries()].map(([key, evs]) => {
              const isBundle = evs.length > 1 || evs[0].taskId !== undefined;
              const first = evs[0];
              const n = names(first);
              const task = first.taskId ? s.tasks.find((t) => t.taskId === first.taskId) : undefined;
              return (
                <div className="card" key={key} style={{ borderColor: "var(--warn)" }}>
                  <div className="spread">
                    <div>
                      <b>{task ? `Task transaction — “${task.title}”` : `${first.action} · ${n.resource}`}</b>
                      <div className="small dim">
                        {isBundle && task
                          ? `${task.steps.length} actions in this task · ${task.steps.filter((x) => x.state === "done").length} auto-allowed · ${evs.length} need authorization`
                          : `Requested by ${n.user} via ${n.agent}${first.application ? ` (${first.application})` : ""} · ${timeAgo(first.timestamp)}`}
                      </div>
                    </div>
                    <div className="row">
                      <RiskChip r={first.risk} />
                      <Chip tone="review">expires {new Date(first.reviewState!.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Chip>
                    </div>
                  </div>

                  {evs.map((e) => {
                    const en = names(e);
                    return (
                      <div key={e.id} className="card" style={{ marginTop: 12, background: "var(--bg-inset)" }}>
                        <div className="spread">
                          <div>
                            <span className="mono small">{e.actionRaw ?? e.action}</span>
                            <span className="dim small"> → {en.resource} · {e.environment}</span>
                          </div>
                          <DecisionChip d="REVIEW" small />
                        </div>
                        <div className="grid g3" style={{ marginTop: 12 }}>
                          <div>
                            <div className="stat-label">Why</div>
                            <div className="small dim">{e.decisionReasons[0]}</div>
                          </div>
                          {e.blastRadius && (
                            <div>
                              <div className="stat-label">Blast radius / preflight</div>
                              <div className="small dim">
                                {e.blastRadius.label}
                                {e.blastRadius.dependencies && <div className="faint">deps: {e.blastRadius.dependencies.join(", ")}</div>}
                              </div>
                            </div>
                          )}
                          {e.safeAlternative && (
                            <div>
                              <div className="stat-label">Safer alternative</div>
                              <div className="small dim">{e.safeAlternative}</div>
                            </div>
                          )}
                        </div>
                        <div className="row" style={{ marginTop: 14 }}>
                          <button className="btn btn-good btn-sm" onClick={() => resolveReview(e.id, "approved", "u-alex", "Approved once")}>Approve once</button>
                          <button className="btn btn-sm" onClick={() => resolveReview(e.id, "approved_scoped", "u-alex", "Scoped", "This resource only · 4h · no wider authority")}>Approve scoped</button>
                          <button className="btn btn-warn btn-sm" onClick={() => resolveReview(e.id, "constrained", "u-alex", "Constrained to the safer alternative")}>Constrain</button>
                          <button className="btn btn-danger btn-sm" onClick={() => resolveReview(e.id, "denied", "u-alex", "Denied")}>Deny</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(e)}>Full evidence <ArrowRight size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="section">
          <SectionHead
            title="Resolved"
            sub="A denied review remains denied. Approvals are per-action and never silently widen later scope."
          />
          <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Request</th><th>Requester</th><th>Outcome</th><th>Reviewer</th><th>Note / scope</th></tr></thead>
              <tbody>
                {resolved.slice(0, 12).map((e) => {
                  const n = names(e);
                  return (
                    <tr key={e.id} className="rowlink" onClick={() => setOpen(e)}>
                      <td className="mono small">{e.actionRaw ?? e.action} → {n.resource}</td>
                      <td className="small">{n.user}</td>
                      <td><StatusChip s={e.reviewState!.status} /></td>
                      <td className="small">{e.reviewState!.reviewer === "u-alex" ? "Alex Morgan" : e.reviewState!.reviewer === "u-maya" ? "Maya Chen" : e.reviewState!.reviewer ?? "—"}</td>
                      <td className="small dim">{e.reviewState!.scope ?? e.reviewState!.note ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && <EventDetail e={s.events.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
