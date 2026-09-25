// Standing Permissions — an agent's everyday authority on one system, outside
// any task. Enforced by the Core Brain: in-scope work flows, limits and the
// "may not" list apply, and once revoked or expired that agent's work there
// needs a human yes. Inside a task, the task's permission slip is the authority.
import { useMemo, useState } from "react";
import { useAppState, revokeStanding, grantStandingAgain, shadowEvaluate } from "../state/store";
import { PageHead, SectionHead, MetricBar, Chip, SimNote, AgentMark, Avatar, DecisionChip, PageTabs } from "../ui/kit";
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
  // Everything not in force: the complement of `active`, so the two tabs always partition s.standing.
  const inactive = s.standing.filter((p) => !isActive(p));

  const renderCard = (p: StandingPermission) => {
    const on = isActive(p);
    const imp = impact[p.id];
    const res = resourceById(p.resource)?.name ?? p.resource;
    const soon = daysLeftOf(p) <= 2;
    return (
      <article className="card" key={p.id} style={on ? undefined : { borderColor: "var(--bad)" }}>
        {/* Header — agent mark, the resource this authority covers, and who granted it */}
        <div className="spread" style={{ alignItems: "flex-start", gap: 16 }}>
          <div className="row" style={{ gap: 13, flexWrap: "nowrap", alignItems: "center", minWidth: 0 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, display: "grid", placeItems: "center", background: "var(--surface-2)", border: "1px solid var(--line)", flexShrink: 0 }}>
              <AgentMark agentId={p.agent} size={22} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 7 }}>
                <span style={{ fontWeight: 700, fontSize: 15.5, letterSpacing: "-0.01em" }}>{agentById(p.agent)?.name}</span>
                <span className="faint small">everyday authority on</span>
                <span className="chip c-neutral chip-mono">{res}</span>
              </div>
              <div className="row small dim" style={{ gap: 6, marginTop: 6 }}>
                <Avatar userId={p.grantedBy} size={16} /> granted by {userById(p.grantedBy)?.name}
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 6, flexShrink: 0 }}>
            <Chip tone={on ? "allow" : "block"}>{on ? "ACTIVE" : p.status === "revoked" ? "REVOKED" : "EXPIRED"}</Chip>
            {on && <Chip tone={soon ? "review" : "neutral"}><Clock size={11} /> expires in {daysLeftOf(p)}d</Chip>}
          </div>
        </div>

        {/* May / May not — the two faces of one authority */}
        <div className="grid g2" style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--line)", gap: 24 }}>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", background: "var(--allow-soft)", color: "var(--allow)", flexShrink: 0 }}><Check size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--allow)" }}>May</span>
            </div>
            <ul style={{ margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {p.allowed.map((a) => (
                <li key={a} className="row small" style={{ gap: 9, alignItems: "flex-start", listStyle: "none" }}>
                  <Check size={13} style={{ color: "var(--allow)", flexShrink: 0, marginTop: 3 }} />
                  <span style={{ lineHeight: 1.5 }}>{a}</span>
                </li>
              ))}
              {p.maxRows !== undefined && (
                <li className="row small" style={{ gap: 9, alignItems: "flex-start", listStyle: "none" }}>
                  <Check size={13} style={{ color: "var(--allow)", flexShrink: 0, marginTop: 3 }} />
                  <span style={{ lineHeight: 1.5 }}>at most <b>{p.maxRows}</b> rows per query</span>
                </li>
              )}
              {p.maxFilesPerTask > 0 && (
                <li className="row small" style={{ gap: 9, alignItems: "flex-start", listStyle: "none" }}>
                  <Check size={13} style={{ color: "var(--allow)", flexShrink: 0, marginTop: 3 }} />
                  <span style={{ lineHeight: 1.5 }}>at most <b>{p.maxFilesPerTask}</b> files per task <span className="faint">(enforced by the task's slip)</span></span>
                </li>
              )}
            </ul>
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, display: "grid", placeItems: "center", background: "var(--block-soft)", color: "var(--block)", flexShrink: 0 }}><Ban size={13} /></span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--block)" }}>May not</span>
            </div>
            <ul style={{ margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {p.forbidden.map((a) => (
                <li key={a} className="row small" style={{ gap: 9, alignItems: "flex-start", listStyle: "none" }}>
                  <X size={13} style={{ color: "var(--block)", flexShrink: 0, marginTop: 3 }} />
                  <span style={{ lineHeight: 1.5 }}>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Revoke-impact preview — grounded in the agent's recorded everyday work */}
        <div className="kernel-impact" style={{ marginTop: 18 }}>
          <div className="row" style={{ gap: 9, alignItems: "flex-start", flexWrap: "nowrap" }}>
            <Activity size={14} className="faint" style={{ flexShrink: 0, marginTop: 2 }} />
            <div className="small" style={{ lineHeight: 1.55 }}>
              <b>Used {imp.used} time{imp.used === 1 ? "" : "s"}</b> for everyday work.{" "}
              {on ? (
                imp.wouldReview.length === 0
                  ? "Revoking it would not change any recorded action."
                  : <>If you revoked it, <b>{imp.wouldReview.length}</b> of those would have needed a human yes:</>
              ) : (
                <>Revoked — {agentById(p.agent)?.name}'s work on {res} now needs a human yes.</>
              )}
            </div>
          </div>
          {on && imp.wouldReview.slice(0, 3).map((w) => (
            <div key={w.id} className="row small" style={{ gap: 8, marginTop: 9, flexWrap: "nowrap" }}>
              <DecisionChip d="ALLOW" small /><ArrowRight size={12} className="faint" style={{ flexShrink: 0 }} /><DecisionChip d="REVIEW" small /><span className="dim" style={{ minWidth: 0 }}>{w.text}</span>
            </div>
          ))}
        </div>

        <div className="row" style={{ marginTop: 16, gap: 8 }}>
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
      </article>
    );
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Standing Permissions"
        sub="An agent's everyday authority on one system, outside any task. While it's active, normal work flows; its limits and 'may not' list are enforced; once revoked or expired, that agent's work there needs a human yes."
        right={<SimNote>Enforced by the Core Brain</SimNote>}
      />

      <div className="card">
        <MetricBar
          band
          items={[
            { label: "Active", value: active.length, tone: "good", note: "in force right now" },
            { label: "Expiring soon", value: expiringSoon, tone: expiringSoon > 0 ? "warn" : "good", note: "within 2 days" },
            { label: "Revoked / expired", value: s.standing.length - active.length, note: "needs a yes again" },
            { label: "Everyday actions covered", value: totalUsed, note: "recorded, outside tasks" },
          ]}
        />
      </div>

      <PageTabs storageKey="standing" tabs={[
        {
          id: "active",
          label: "Active",
          count: active.length,
          content: active.length === 0 ? (
            s.standing.length === 0 ? (
              <div className="card empty"><ShieldCheck size={26} className="dim" /><div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No standing permissions yet</div><div className="small dim" style={{ maxWidth: 480, margin: "6px auto 0", lineHeight: 1.55 }}>Until one is granted, every agent action on these systems needs a human yes.</div></div>
            ) : (
              <div className="card empty"><ShieldCheck size={26} className="dim" /><div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No standing permission is in force</div><div className="small dim" style={{ maxWidth: 480, margin: "6px auto 0", lineHeight: 1.55 }}>Every one has been revoked or has expired, so every agent action on these systems needs a human yes. Grant one again from Revoked &amp; expired.</div></div>
            )
          ) : (
            <>
              <SectionHead title="Active permissions" sub="Who holds each one, what it allows, what it never allows, and what would change if you revoked it" />
              <div className="grid" style={{ gap: 16 }}>{active.map(renderCard)}</div>
            </>
          ),
        },
        {
          id: "inactive",
          label: "Revoked & expired",
          count: inactive.length,
          content: inactive.length === 0 ? (
            <div className="card empty"><Ban size={26} className="dim" /><div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>Nothing revoked or expired</div><div className="small dim" style={{ maxWidth: 480, margin: "6px auto 0", lineHeight: 1.55 }}>A permission lands here the moment it is revoked or passes its expiry, and can be granted again from here.</div></div>
          ) : (
            <>
              <SectionHead title="Revoked & expired" sub="No longer in force: that agent's work on the system needs a human yes until the permission is granted again" />
              <div className="grid" style={{ gap: 16 }}>{inactive.map(renderCard)}</div>
            </>
          ),
        },
      ]} />

      <div className="small faint row" style={{ gap: 6, marginTop: 16 }}>
        Inside a task, the task's own permission slip is the authority instead —
        <a className="row" style={{ gap: 4 }} onClick={() => nav("tasks")}>Tasks <ArrowRight size={13} /></a>
      </div>
    </div>
  );
}
