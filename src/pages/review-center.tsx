// Review Center — only exceptional items; impact, blast radius, safer
// alternative, expiry, requester separation, transaction bundling.
import { useState } from "react";
import { useAppState, resolveReview, approverFor } from "../state/store";
import { PageHead, SectionHead, MetricBar, DecisionChip, Chip, RiskChip, SimNote, names, timeAgo, StatusChip, Avatar, AgentMark, DestMark, PageTabs, usePaged, Pager } from "../ui/kit";
import { describe } from "../ui/describe";
import { userById } from "../model/org";
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

  // Presentation only: page through bundles and the resolved log so neither tab
  // becomes a long scroll. Counts above are always over the full lists.
  const pagedBundles = usePaged([...bundles.entries()], 2);
  const pagedResolved = usePaged(resolved, 12);

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Review Center"
        sub="Humans review exceptions, not every action. Related actions arrive as one coherent bundle with purpose, blast radius, risk, expiry and a safer alternative. Requester and approver are separated."
        right={<SimNote>Each request goes to the right approver — never the requester</SimNote>}
      />

      {/* Lead with the inbox — the work that needs a human. Counts live in the
          tab strip and section header, not in a row of oversized number boxes. */}
      <PageTabs storageKey="reviews" tabs={[
        { id: "pending", label: "Awaiting your decision", count: pending.length, content: (<>
          <SectionHead
            title="Awaiting your decision"
            sub="Each bundle shows purpose, blast radius, risk, expiry and a safer alternative before you act"
            right={
              <div className="row" style={{ gap: 8 }}>
                <Chip tone={pending.length > 0 ? "review" : "allow"}>
                  <Hand size={12} /> {pending.length} awaiting
                </Chip>
                {bundles.size > 0 && (
                  <Chip tone="neutral"><Layers size={12} /> {bundles.size} bundle{bundles.size === 1 ? "" : "s"}</Chip>
                )}
              </div>
            }
          />

          {pending.length === 0 ? (
            <div className="card empty">
              Nothing waiting — every exception has been decided. Normal safe work auto-allows; transformable work auto-constrains.
              Generate exceptions from the <a onClick={() => nav("simlab")}>Simulation Lab</a> or <a onClick={() => nav("tasks")}>Tasks</a>.
            </div>
          ) : (<>
            <div className="grid" style={{ gap: 16 }}>
              {pagedBundles.rows.map(([key, evs]) => {
                const isBundle = evs.length > 1 || evs[0].taskId !== undefined;
                const first = evs[0];
                const n = names(first);
                const task = first.taskId ? s.tasks.find((t) => t.taskId === first.taskId) : undefined;
                return (
                  <div
                    className="card"
                    key={key}
                    style={{ borderColor: "color-mix(in oklab, var(--review) 32%, var(--line))", padding: "18px 20px 16px" }}
                  >
                    {/* Panel header — what, who asked, risk & expiry */}
                    <div className="spread" style={{ alignItems: "flex-start", gap: 12 }}>
                      <div className="row" style={{ gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                        <span className="plane-icon" style={{ background: "var(--review-soft)" }}>
                          <AgentMark agentId={first.agent} size={18} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 650, fontSize: 15, letterSpacing: "-0.01em", lineHeight: 1.3 }}>
                            {task ? `${task.team ?? "Task"} · “${task.title}”` : describe(first)}
                          </div>
                          <div className="small dim" style={{ marginTop: 3 }}>
                            {isBundle && task
                              ? `Asked by ${n.user} via ${n.agent} · ${task.steps.length} steps · ${task.steps.filter((x) => x.state === "done").length} already done · ${evs.length} need${evs.length === 1 ? "s" : ""} a yes`
                              : `Requested by ${n.user} via ${n.agent}${first.application ? ` (${first.application})` : ""} · ${timeAgo(first.timestamp)}`}
                          </div>
                        </div>
                      </div>
                      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                        {isBundle && <Chip tone="neutral"><Layers size={12} /> {evs.length} step{evs.length === 1 ? "" : "s"}</Chip>}
                        <RiskChip r={first.risk} />
                        <Chip tone="review">expires {new Date(first.reviewState!.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Chip>
                      </div>
                    </div>

                    {/* Requester → approver — the separation, made visible */}
                    <div
                      className="row"
                      style={{ gap: 10, marginTop: 14, paddingTop: 13, borderTop: "1px solid var(--line)", flexWrap: "wrap" }}
                    >
                      <span className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
                        <Avatar userId={first.user} size={20} />
                        <span className="small"><span className="faint">Requested by </span><b>{n.user}</b></span>
                      </span>
                      <ArrowRight size={13} style={{ color: "var(--fg-4)" }} />
                      <span className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
                        <Avatar userId={approverFor(first)} size={20} />
                        <span className="small">
                          <span className="faint">Decides </span>
                          <b>{userById(approverFor(first))?.name}</b>{" "}
                          <span className="faint">· {task?.approverRole ?? userById(approverFor(first))?.role}</span>
                        </span>
                      </span>
                    </div>

                    {/* One card per action in the bundle */}
                    {evs.map((e) => {
                      const en = names(e);
                      const br = e.blastRadius;
                      const brBits: { k: string; v: string }[] = [];
                      if (br) {
                        if (typeof br.files === "number") brBits.push({ k: "files", v: br.files.toLocaleString("en-US") });
                        if (typeof br.rows === "number") brBits.push({ k: "rows", v: br.rows.toLocaleString("en-US") });
                        if (typeof br.records === "number") brBits.push({ k: "records", v: br.records.toLocaleString("en-US") });
                        if (typeof br.recipients === "number") brBits.push({ k: "recipients", v: br.recipients.toLocaleString("en-US") });
                        if (typeof br.spendUsd === "number") brBits.push({ k: "spend", v: `$${br.spendUsd.toLocaleString("en-US")}` });
                      }
                      return (
                        <div key={e.id} className="card" style={{ marginTop: 12 }}>
                          <div className="spread" style={{ alignItems: "flex-start", gap: 10 }}>
                            <div style={{ minWidth: 0 }}>
                              <div className="stream-sentence">{describe(e)}</div>
                              <div className="stream-meta" style={{ gap: 8 }}>
                                <span className="mono">{e.actionRaw ?? e.action}</span>
                                <span className="faint">·</span>
                                <span className="row" style={{ gap: 5, flexWrap: "nowrap" }}><Avatar userId={e.user} size={16} />{en.user}</span>
                                <span className="faint">·</span>
                                <span>{e.environment}</span>
                                {e.destination && (
                                  <>
                                    <span className="faint">·</span>
                                    <span className="row" style={{ gap: 5, flexWrap: "nowrap" }}><DestMark destId={e.destination} size={14} />{en.destination}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <DecisionChip d="REVIEW" small />
                          </div>

                          <div className="grid g3" style={{ marginTop: 14 }}>
                            <div>
                              <div className="stat-label">Why</div>
                              <div className="small dim" style={{ marginTop: 4 }}>{e.decisionReasons[0]}</div>
                            </div>
                            {br && (
                              <div>
                                <div className="stat-label">Blast radius / preflight</div>
                                <div className="small dim" style={{ marginTop: 4 }}>{br.label}</div>
                                {brBits.length > 0 && (
                                  <div className="row" style={{ gap: 5, marginTop: 6 }}>
                                    {brBits.map((b) => (
                                      <Chip key={b.k} tone="neutral">{b.v} {b.k}</Chip>
                                    ))}
                                  </div>
                                )}
                                {br.dependencies && <div className="faint small" style={{ marginTop: 6 }}>deps: {br.dependencies.join(", ")}</div>}
                              </div>
                            )}
                            {e.safeAlternative && (
                              <div>
                                <div className="stat-label">Safer alternative</div>
                                <div className="small dim" style={{ marginTop: 4 }}>{e.safeAlternative}</div>
                              </div>
                            )}
                          </div>

                          <div className="row" style={{ marginTop: 16, gap: 8 }}>
                            <button className="btn btn-good btn-sm" onClick={() => resolveReview(e.id, "approved", approverFor(e), "Approved once")}><CheckCircle2 size={13} /> Approve once</button>
                            <button className="btn btn-sm" onClick={() => resolveReview(e.id, "approved_scoped", approverFor(e), "Scoped", "This resource only · 4h · no wider authority")}>Approve scoped</button>
                            <button className="btn btn-warn btn-sm" onClick={() => resolveReview(e.id, "constrained", approverFor(e), "Constrained to the safer alternative")}>Constrain</button>
                            <button className="btn btn-danger btn-sm" onClick={() => resolveReview(e.id, "denied", approverFor(e), "Denied")}><XCircle size={13} /> Deny</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setOpen(e)} style={{ marginLeft: "auto" }}>Full evidence <ArrowRight size={13} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <Pager {...pagedBundles} />
          </>)}
        </>) },

        { id: "resolved", label: "Resolved", count: resolved.length, content: (<>
          <SectionHead
            title="Resolved"
            sub="A denied review remains denied. Approvals are per-action and never silently widen later scope."
          />

          {resolved.length === 0 ? (
            <div className="card empty">
              No decisions yet — approved, constrained and denied exceptions appear here once a reviewer acts.
            </div>
          ) : (<>
            {/* Refined outcome strip — small numbers in one carded band. */}
            <div className="card" style={{ marginBottom: 16 }}>
              <MetricBar band items={[
                { label: "Approved", value: approved, tone: approved > 0 ? "good" : undefined, note: "per-action, never widened later" },
                { label: "Constrained", value: constrained, tone: constrained > 0 ? "info" : undefined, note: "steered to a safer path" },
                { label: "Denied", value: denied, tone: denied > 0 ? "bad" : undefined, note: "stays denied; no silent retry" },
                { label: "Decided", value: resolved.length, note: "exceptions closed by a human" },
              ]} />
            </div>

            <div className="card card-pad-0">
              <table className="tbl">
                <thead><tr><th>Request</th><th>Requester</th><th>Outcome</th><th>Reviewer</th><th>Note / scope</th></tr></thead>
                <tbody>
                  {pagedResolved.rows.map((e) => {
                    const n = names(e);
                    const reviewer = e.reviewState!.reviewer;
                    return (
                      <tr key={e.id} className="rowlink" onClick={() => setOpen(e)}>
                        <td>
                          <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                            <AgentMark agentId={e.agent} size={15} />
                            <div style={{ minWidth: 0 }}>
                              <div className="small" style={{ fontWeight: 550 }}>{describe(e)}</div>
                              <div className="mono faint" style={{ fontSize: 11, marginTop: 2 }}>{e.action}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="row small" style={{ gap: 6, flexWrap: "nowrap" }}><Avatar userId={e.user} size={17} />{n.user}</span>
                        </td>
                        <td><StatusChip s={e.reviewState!.status} /></td>
                        <td>
                          {reviewer
                            ? <span className="row small" style={{ gap: 6, flexWrap: "nowrap" }}><Avatar userId={reviewer} size={17} />{userById(reviewer)?.name ?? reviewer}</span>
                            : <span className="small faint">—</span>}
                        </td>
                        <td className="small dim">{e.reviewState!.scope ?? e.reviewState!.note ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pager {...pagedResolved} />
            </div>
          </>)}
        </>) },
      ]} />

      {open && <EventDetail e={s.events.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
