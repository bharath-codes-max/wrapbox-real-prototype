// Shared filterable event stream — used by Live Actions and embedded elsewhere.
import { useMemo, useState } from "react";
import type { SimulationEvent } from "../model/types";
import { Avatar, AgentMark, DecisionChip, names, clock, RiskChip } from "./kit";
import { EventDetail } from "./event-detail";
import { AGENTS, USERS } from "../model/org";

export function EventStream({
  events, nav, compact, limit, filters = true,
}: {
  events: SimulationEvent[];
  nav: (r: string) => void;
  compact?: boolean;
  limit?: number;
  filters?: boolean;
}) {
  const [fAgent, setFAgent] = useState("");
  const [fUser, setFUser] = useState("");
  const [fPlane, setFPlane] = useState("");
  const [fDecision, setFDecision] = useState("");
  const [fRisk, setFRisk] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<SimulationEvent | null>(null);

  const filtered = useMemo(() => {
    let list = [...events].sort((a, b) => b.timestamp - a.timestamp);
    if (fAgent) list = list.filter((e) => e.agent === fAgent);
    if (fUser) list = list.filter((e) => e.user === fUser);
    if (fPlane) list = list.filter((e) => e.plane === fPlane);
    if (fDecision) list = list.filter((e) => e.decision === fDecision);
    if (fRisk) list = list.filter((e) => e.risk === fRisk);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((e) =>
        [e.resource, e.actionRaw, e.action, e.id, ...(e.dataClasses)].join(" ").toLowerCase().includes(s)
      );
    }
    return limit ? list.slice(0, limit) : list;
  }, [events, fAgent, fUser, fPlane, fDecision, fRisk, q, limit]);

  return (
    <>
      {filters && (
        <div className="row" style={{ marginBottom: 12 }}>
          <input className="input" placeholder="Search resource, action, data class…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
          <select className="select" style={{ width: "auto" }} value={fAgent} onChange={(e) => setFAgent(e.target.value)}>
            <option value="">All agents</option>
            {AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="select" style={{ width: "auto" }} value={fUser} onChange={(e) => setFUser(e.target.value)}>
            <option value="">All users</option>
            {USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="select" style={{ width: "auto" }} value={fPlane} onChange={(e) => setFPlane(e.target.value)}>
            <option value="">All planes</option>
            <option>ENDPOINT</option><option>NETWORK</option><option>GATEWAY</option>
          </select>
          <select className="select" style={{ width: "auto" }} value={fDecision} onChange={(e) => setFDecision(e.target.value)}>
            <option value="">All decisions</option>
            <option>ALLOW</option><option>CONSTRAIN</option><option>REVIEW</option><option>BLOCK</option>
          </select>
          <select className="select" style={{ width: "auto" }} value={fRisk} onChange={(e) => setFRisk(e.target.value)}>
            <option value="">All risk</option>
            <option value="low">low</option><option value="moderate">moderate</option>
            <option value="high">high</option><option value="critical">critical</option>
          </select>
        </div>
      )}
      <div className="card" style={{ padding: compact ? "4px 12px" : "6px 14px" }}>
        {filtered.length === 0 && <div className="empty">No events match the current filters.</div>}
        {filtered.map((e) => {
          const n = names(e);
          return (
            <div className="stream-item rowlink" key={e.id} onClick={() => setOpen(e)} style={{ cursor: "pointer" }}>
              <span className="stream-time">{clock(e.timestamp)}</span>
              <span className="stream-text">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, verticalAlign: "middle" }}>
                  <Avatar userId={e.user} size={17} /><b>{n.user}</b>
                </span>
                <span className="sep">→</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, verticalAlign: "middle" }}>
                  <AgentMark agentId={e.agent} size={14} /><b>{n.agent}</b>
                </span>
                {e.application && <><span className="sep">→</span>{e.application}</>}
                <span className="sep">→</span>
                <span className="mono">{e.actionRaw ?? e.action}</span>
                <span className="sep">→</span>
                {n.resource}
                {n.destination && <><span className="sep">→</span><span className="dim">{n.destination}</span></>}
              </span>
              {!compact && <RiskChip r={e.risk} />}
              <DecisionChip d={e.decision} small />
            </div>
          );
        })}
      </div>
      {open && <EventDetail e={events.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </>
  );
}
