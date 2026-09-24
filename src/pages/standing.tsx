// Standing Permissions — scoped, expiring standing authorization.
import { useAppState, revokeStanding } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, SimNote } from "../ui/kit";
import { agentById, userById } from "../model/org";
import { ShieldCheck, Clock, Ban, Check, X, ArrowRight } from "lucide-react";

export function StandingPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const daysLeftOf = (p: (typeof s.standing)[number]) =>
    Math.max(0, Math.round((p.expiresAt - Date.now()) / (24 * 3600 * 1000)));
  const active = s.standing.filter((p) => p.status === "active");
  const expiringSoon = active.filter((p) => daysLeftOf(p) <= 2).length;
  const inactive = s.standing.length - active.length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Standing Permissions"
        sub="Standing authority is always scoped and always expires. Repeated approvals never silently widen these grants — widening requires an explicit human decision."
        right={<SimNote />}
      />

      <div className="grid g3">
        <Stat icon={<ShieldCheck size={17} />} label="Active grants" value={active.length} tone="good" note="scoped, time-boxed authority" />
        <Stat icon={<Clock size={17} />} label="Expiring soon" value={expiringSoon} tone={expiringSoon > 0 ? "warn" : "good"} note="within 2 days" />
        <Stat icon={<Ban size={17} />} label="Revoked / expired" value={inactive} note="no longer in force" />
      </div>

      <div className="section">
        <SectionHead title="Grants" sub="Every standing grant, its scope, its expiry, and what it may never do" />
        {s.standing.length === 0 ? (
          <div className="card"><div className="empty">No standing permissions in force.</div></div>
        ) : (
          <div className="grid">
            {s.standing.map((p) => {
              const daysLeft = daysLeftOf(p);
              return (
                <div className="card" key={p.id} style={p.status !== "active" ? { opacity: 0.55 } : undefined}>
                  <div className="spread">
                    <div>
                      <b>{agentById(p.agent)?.name}</b> <span className="dim">may act on</span> <b>{p.scope}</b>
                      <div className="small faint" style={{ marginTop: 4 }}>granted by {userById(p.grantedBy)?.name} · window: {p.window}</div>
                    </div>
                    <div className="row">
                      <Chip tone={p.status === "active" ? "allow" : "block"}>{p.status}</Chip>
                      <Chip tone={daysLeft <= 2 ? "review" : "neutral"}>expires in {daysLeft}d</Chip>
                    </div>
                  </div>
                  <div className="grid g2" style={{ marginTop: 18 }}>
                    <div>
                      <div className="stat-label"><span className="row" style={{ color: "var(--good)" }}><Check size={13} /> May</span></div>
                      <ul className="small dim" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                        {p.allowed.map((a) => <li key={a}>{a}</li>)}
                        {p.maxFilesPerTask > 0 && <li>maximum {p.maxFilesPerTask} files per task</li>}
                      </ul>
                    </div>
                    <div>
                      <div className="stat-label"><span className="row" style={{ color: "var(--bad)" }}><X size={13} /> May not</span></div>
                      <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6, color: "var(--bad)" }}>
                        {p.forbidden.map((a) => <li key={a}>{a}</li>)}
                      </ul>
                    </div>
                  </div>
                  {p.status === "active" && (
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 16 }} onClick={() => revokeStanding(p.id)}>Revoke</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="section">
        <div className="card">
          <div className="spread">
            <div className="small dim" style={{ lineHeight: 1.6 }}>
              Need broader authority? Task-scoped envelopes are preferred over widening standing grants.
            </div>
            <button className="btn btn-sm" onClick={() => nav("tasks")}>Go to Tasks <ArrowRight size={13} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
