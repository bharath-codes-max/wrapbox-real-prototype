// Control Room — executive/operations dashboard. Every number derives from
// the event store; every metric is clickable to its inspectable source.
import { useAppState, metrics } from "../state/store";
import { PageHead, Stat, Chip, StatusChip, SimNote } from "../ui/kit";
import { EventStream } from "../ui/event-stream";
import { AGENTS, DEVICES } from "../model/org";
import { CAPABILITIES } from "../model/registries";

export function ControlRoom({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = metrics(s);
  const activeAgents = AGENTS.filter((a) => !a.discovered).length;
  const discovered = AGENTS.filter((a) => a.discovered).length;
  const parked = s.events.filter((e) => e.status === "parked").length;
  const planeStatus = (plane: string) => {
    const caps = CAPABILITIES.filter((c) => c.plane === plane);
    const enforced = caps.filter((c) => c.status === "ENFORCED").length;
    return { enforced, total: caps.length };
  };

  return (
    <div className="page">
      <PageHead
        title="Control Room"
        sub={`Veridian Systems · ${activeAgents} registered agents · ${DEVICES.length} protected devices · every figure below derives from live event state`}
        right={<SimNote />}
      />

      <div className="grid g4">
        <Stat label="Active agents" value={activeAgents} note={discovered > 0 ? `+${discovered} discovered, unregistered` : "all registered"} onClick={() => nav("agents")} />
        <Stat label="Pending reviews" value={m.pendingReviews} tone={m.pendingReviews > 0 ? "warn" : "good"} note={parked > 0 ? `${parked} task step(s) parked` : "no parked steps"} onClick={() => nav("reviews")} />
        <Stat label="Secrets protected" value={m.secretsProtected} tone="good" note="credential exfiltration blocked" onClick={() => nav("evidence")} />
        <Stat label="High-risk events" value={m.highRisk} tone={m.highRisk > 0 ? "bad" : "good"} note="risk ≥ high, all planes" onClick={() => nav("evidence")} />
      </div>

      <div className="grid g4" style={{ marginTop: 12 }}>
        <Stat label="Allowed" value={m.counts.ALLOW} note="normal work flowed automatically" onClick={() => nav("live")} />
        <Stat label="Constrained" value={m.counts.CONSTRAIN} tone="info" note={`${m.transfersTransformed} sensitive transfer(s) transformed`} onClick={() => nav("live")} />
        <Stat label="Reviewed" value={m.counts.REVIEW} tone="warn" note="exceptions escalated to humans" onClick={() => nav("reviews")} />
        <Stat label="Blocked" value={m.counts.BLOCK} tone="bad" note="stopped before execution" onClick={() => nav("live")} />
      </div>

      <div className="grid g3" style={{ marginTop: 12 }}>
        {(["ENDPOINT", "NETWORK", "GATEWAY"] as const).map((p) => {
          const st = planeStatus(p);
          return (
            <div className="card" key={p} style={{ cursor: "pointer" }} onClick={() => nav("coverage")}>
              <div className="spread">
                <b>{p.charAt(0) + p.slice(1).toLowerCase()} plane</b>
                <Chip tone={st.enforced === st.total ? "enforced" : "degraded"}>
                  {st.enforced}/{st.total} capabilities enforced
                </Chip>
              </div>
              <div className="small dim" style={{ marginTop: 6 }}>
                {p === "ENDPOINT" && "Local device actions: file, process, secrets"}
                {p === "NETWORK" && "Outbound & inbound traffic: HTTPS, uploads, AI destinations"}
                {p === "GATEWAY" && "External systems: GitHub, SQL, cloud, MCP"}
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                {CAPABILITIES.filter((c) => c.plane === p).slice(0, 3).map((c) => (
                  <span key={c.id} className="small faint">{c.label} <StatusChip s={c.status} /></span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="spread" style={{ margin: "20px 0 8px" }}>
        <h2 style={{ fontSize: 14 }}>Recent activity</h2>
        <button className="btn btn-sm" onClick={() => nav("live")}>Open Live Actions →</button>
      </div>
      <EventStream events={s.events} nav={nav} compact limit={8} filters={false} />
    </div>
  );
}
