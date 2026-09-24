// Standing Permissions — an agent's everyday authority on one system, outside
// any task. Enforced by the Core Brain: in-scope work flows, limits and the
// "may not" list apply, and once revoked or expired that agent's work there
// needs a human yes. Inside a task, the task's permission slip is the authority.
import { useMemo, useState } from "react";
import { useAppState, revokeStanding, grantStandingAgain, shadowEvaluate } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, SimNote, AgentMark, Avatar, DecisionChip } from "../ui/kit";
import { agentById, resourceById, userById } from "../model/org";
import { scenarioById } from "../engine/scenarios";
import { describe } from "../ui/describe";
import type { StandingPermission } from "../model/types";
import { ShieldCheck, Clock, Ban, Check, X, ArrowRight, Activity, RotateCcw } from "lucide-react";

export function StandingPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [confirming, setConfirming] = useState<string | null>(null);
  const daysLeftOf = (p: StandingPermission) => Math.max(0, Math.round((p.expiresAt - Date.now()) / (24 * 3600 * 1000)));
  const isActive = (p: StandingPermission) => p.status === "active" && p.expiresAt > Date.now();
  const active = s.standing.filter(isActive);
  const expiringSoon = active.filter((p) => daysLeftOf(p) <= 2).length;

  // Everyday (non-task) actions each permission covers, and what revoking it would change.
  const impact = useMemo(() => {
    const out: Record<string, { used: number; wouldReview: { id: string; text: string }[] }> = {};
    for (const p of s.standing) {
      const covered = s.events.filter((e) => e.agent === p.agent && e.resource === p.resource && !e.taskId);
      const revoked = s.standing.map((x) => (x.id === p.id ? { ...x, status: "revoked" as const } : x));
      const wouldReview = covered
        .filter((e) => e.scenario && scenarioById(e.scenario))
        .filter((e) => {
          const sc = scenarioById(e.scenario!)!;
          const now = shadowEvaluate(sc, s.contracts, s.kernel, s.standing);
          const after = shadowEvaluate(sc, s.contracts, s.kernel, revoked);
          return now !== after;
        })
        .map((e) => ({ id: e.id, text: describe(e) }));
      out[p.id] = { used: covered.length, wouldReview };
    }
    return out;
  }, [s.standing, s.events, s.contracts, s.kernel]);

  const totalUsed = Object.values(impact).reduce((n, x) => n + x.used, 0);

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Standing Permissions"
        sub="An agent's everyday authority on one system, outside any task. While it's active, normal work flows; its limits and 'may not' list are enforced; once revoked or expired, that agent's work there needs a human yes."
        right={<SimNote>Enforced by the Core Brain</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<ShieldCheck size={17} />} label="Active" value={active.length} tone="good" note="in force right now" />
        <Stat icon={<Clock size={17} />} label="Expiring soon" value={expiringSoon} tone={expiringSoon > 0 ? "warn" : "good"} note="within 2 days" />
        <Stat icon={<Ban size={17} />} label="Revoked / expired" value={s.standing.length - active.length} note="needs a yes again" />
        <Stat icon={<Activity size={17} />} label="Everyday actions covered" value={totalUsed} note="recorded, outside tasks" />
      </div>

      <div className="section">
        <SectionHead title="Permissions" sub="Every standing permission, what it allows, what it never allows, and what would change if you revoked it" />
        <div className="grid" style={{ gap: 16 }}>
          {s.standing.map((p) => {
            const on = isActive(p);
            const imp = impact[p.id];
            const res = resourceById(p.resource)?.name ?? p.resource;
            return (
              <div className="card" key={p.id} style={on ? undefined : { borderColor: "var(--bad)" }}>
                <div className="spread" style={{ alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: 10, flexWrap: "nowrap", alignItems: "flex-start" }}>
                    <AgentMark agentId={p.agent} size={22} />
                    <div>
                      <b>{agentById(p.agent)?.name}</b> <span className="dim">— everyday permission on</span> <b>{res}</b>
                      <div className="row small faint" style={{ gap: 6, marginTop: 4 }}>
                        <Avatar userId={p.grantedBy} size={16} /> granted by {userById(p.grantedBy)?.name}
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <Chip tone={on ? "allow" : "block"}>{on ? "ACTIVE" : p.status === "revoked" ? "REVOKED" : "EXPIRED"}</Chip>
                    {on && <Chip tone={daysLeftOf(p) <= 2 ? "review" : "neutral"}>expires in {daysLeftOf(p)}d</Chip>}
                  </div>
                </div>

                <div className="grid g2" style={{ marginTop: 18 }}>
                  <div>
                    <div className="stat-label"><span className="row" style={{ color: "var(--good)" }}><Check size={13} /> May</span></div>
                    <ul className="small dim" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                      {p.allowed.map((a) => <li key={a}>{a}</li>)}
                      {p.maxRows !== undefined && <li>at most <b>{p.maxRows}</b> rows per query</li>}
                      {p.maxFilesPerTask > 0 && <li>at most {p.maxFilesPerTask} files per task (enforced by the task's slip)</li>}
                    </ul>
                  </div>
                  <div>
                    <div className="stat-label"><span className="row" style={{ color: "var(--bad)" }}><X size={13} /> May not</span></div>
                    <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6, color: "var(--bad)" }}>
                      {p.forbidden.map((a) => <li key={a}>{a}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="kernel-impact">
                  <div className="small">
                    <b>Used {imp.used} time{imp.used === 1 ? "" : "s"}</b> for everyday work.{" "}
                    {on ? (
                      imp.wouldReview.length === 0
                        ? "Revoking it would not change any recorded action."
                        : <>If you revoked it, <b>{imp.wouldReview.length}</b> of those would have needed a human yes:</>
                    ) : (
                      <>Revoked — {agentById(p.agent)?.name}'s work on {res} now needs a human yes.</>
                    )}
                  </div>
                  {on && imp.wouldReview.slice(0, 3).map((w) => (
                    <div key={w.id} className="row small" style={{ gap: 8, marginTop: 6 }}>
                      <DecisionChip d="ALLOW" small /><span>→</span><DecisionChip d="REVIEW" small /><span className="dim">{w.text}</span>
                    </div>
                  ))}
                </div>

                <div className="row" style={{ marginTop: 14, gap: 8 }}>
                  {on ? (
                    confirming === p.id ? (
                      <>
                        <span className="small">Revoke {agentById(p.agent)?.name}'s everyday permission on {res}?</span>
                        <button className="btn btn-danger btn-sm" onClick={() => { revokeStanding(p.id); setConfirming(null); }}>Yes, revoke</button>
                        <button className="btn btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
                      </>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirming(p.id)}>Revoke</button>
                    )
                  ) : (
                    <button className="btn btn-sm" onClick={() => grantStandingAgain(p.id, "u-priya")}><RotateCcw size={13} /> Grant again for 7 days</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="small faint row" style={{ gap: 6, marginTop: 14 }}>
          Inside a task, the task's own permission slip is the authority instead —
          <a className="row" style={{ gap: 4 }} onClick={() => nav("tasks")}>Tasks <ArrowRight size={13} /></a>
        </div>
      </div>
    </div>
  );
}
