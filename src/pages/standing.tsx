// Standing Permissions — scoped, expiring standing authorization.
import { useAppState, revokeStanding } from "../state/store";
import { PageHead, Chip, SimNote } from "../ui/kit";
import { agentById, userById } from "../model/org";

export function StandingPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  return (
    <div className="page">
      <PageHead
        title="Standing Permissions"
        sub="Standing authority is always scoped and always expires. Repeated approvals never silently widen these grants — widening requires an explicit human decision."
        right={<SimNote />}
      />
      {s.standing.map((p) => {
        const daysLeft = Math.max(0, Math.round((p.expiresAt - Date.now()) / (24 * 3600 * 1000)));
        return (
          <div className="card" key={p.id} style={p.status !== "active" ? { opacity: 0.55 } : undefined}>
            <div className="spread">
              <div>
                <b>{agentById(p.agent)?.name}</b> <span className="dim">may act on</span> <b>{p.scope}</b>
                <div className="small faint">granted by {userById(p.grantedBy)?.name} · window: {p.window}</div>
              </div>
              <div className="row">
                <Chip tone={p.status === "active" ? "allow" : "block"}>{p.status}</Chip>
                <Chip tone={daysLeft <= 2 ? "review" : "neutral"}>expires in {daysLeft}d</Chip>
              </div>
            </div>
            <div className="grid g2" style={{ marginTop: 10 }}>
              <div>
                <div className="stat-label">May</div>
                <ul className="small dim" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {p.allowed.map((a) => <li key={a}>{a}</li>)}
                  {p.maxFilesPerTask > 0 && <li>maximum {p.maxFilesPerTask} files per task</li>}
                </ul>
              </div>
              <div>
                <div className="stat-label">May not</div>
                <ul className="small" style={{ margin: "4px 0 0", paddingLeft: 18, color: "var(--bad)" }}>
                  {p.forbidden.map((a) => <li key={a}>{a}</li>)}
                </ul>
              </div>
            </div>
            {p.status === "active" && (
              <button className="btn btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => revokeStanding(p.id)}>Revoke</button>
            )}
          </div>
        );
      })}
      <div className="small faint" style={{ marginTop: 8 }}>
        Need broader authority? Task-scoped envelopes in <a onClick={() => nav("tasks")}>Tasks</a> are preferred over widening standing grants.
      </div>
    </div>
  );
}
