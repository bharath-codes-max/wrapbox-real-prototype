// Agent Inventory — every detected agent with identity, tools, destinations,
// risk and per-agent activity derived from the shared event store.
import { useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, Chip, RiskChip, SimNote, Drawer, DecisionChip, timeAgo, AgentMark, Avatar } from "../ui/kit";
import { EventStream } from "../ui/event-stream";
import { AGENTS, deviceById, userById, type OrgAgent } from "../model/org";
import { destById } from "../model/registries";

export function AgentsPage({ nav }: { nav: (r: string) => void; route: string }) {
  const s = useAppState();
  const [open, setOpen] = useState<OrgAgent | null>(null);

  const lastActivity = (id: string) => {
    const evs = s.events.filter((e) => e.agent === id);
    return evs.length ? evs[evs.length - 1].timestamp : undefined;
  };
  const decisionsFor = (id: string) => {
    const evs = s.events.filter((e) => e.agent === id);
    return {
      total: evs.length,
      blocked: evs.filter((e) => e.decision === "BLOCK").length,
      reviewed: evs.filter((e) => e.decision === "REVIEW").length,
    };
  };

  return (
    <div className="page">
      <PageHead
        title="Agent Inventory"
        sub="Automatically discovered agents, applications and tools — including shadow agents nobody registered. Identity: user + device + agent + tool feeds every decision."
        right={<SimNote>Discovery simulated · inventory model real</SimNote>}
      />
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Agent</th><th>Provider</th><th>Owner / Device</th><th>Tools</th>
              <th>Destinations</th><th>Activity</th><th>Trust</th><th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a) => {
              const d = decisionsFor(a.id);
              const last = lastActivity(a.id);
              return (
                <tr key={a.id} className="rowlink" onClick={() => setOpen(a)}>
                  <td>
                    <span className="row" style={{ gap: 7, flexWrap: "nowrap" }}>
                      <AgentMark agentId={a.id} size={18} /><b>{a.name}</b>
                    </span>
                    {a.discovered && <div style={{ marginTop: 3 }}><Chip tone="critical">DISCOVERED · UNREGISTERED</Chip></div>}
                  </td>
                  <td className="dim">{a.provider}</td>
                  <td className="small">
                    {a.owner ? (
                      <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <Avatar userId={a.owner} size={18} />{userById(a.owner)?.name}
                      </span>
                    ) : <span className="faint">unknown</span>}
                    <div className="faint">{a.device ? deviceById(a.device)?.name : "—"}</div>
                  </td>
                  <td className="small dim">{a.tools.join(", ")}</td>
                  <td className="small dim">{a.destinations.map((x) => destById(x)?.label ?? x).join(", ")}</td>
                  <td className="small">
                    {d.total} events
                    {d.blocked > 0 && <span style={{ color: "var(--bad)" }}> · {d.blocked} blocked</span>}
                    <div className="faint">{last ? timeAgo(last) : "no activity"}</div>
                  </td>
                  <td><Chip tone={a.trust === "trusted" ? "allow" : a.trust === "conditional" ? "constrain" : a.trust === "unknown" ? "critical" : "block"}>{a.trust}</Chip></td>
                  <td><RiskChip r={a.risk} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <Drawer onClose={() => setOpen(null)}>
          <h2 style={{ fontSize: 16, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <AgentMark agentId={open.id} size={20} />{open.name}
          </h2>
          <div className="row small dim" style={{ marginBottom: 12 }}>
            {open.provider} · {open.kind}
            {open.discovered && <Chip tone="critical">SHADOW AGENT — discovered by traffic analysis</Chip>}
          </div>
          <dl className="kv">
            <dt>Owner</dt><dd>{open.owner ? userById(open.owner)?.name : "unknown — no registered owner"}</dd>
            <dt>Device</dt><dd>{open.device ? deviceById(open.device)?.name : "—"}</dd>
            <dt>Environment</dt><dd>{open.environment}</dd>
            <dt>Tools</dt><dd>{open.tools.join(", ")}</dd>
            <dt>Destinations</dt><dd>{open.destinations.map((x) => destById(x)?.label ?? x).join(", ")}</dd>
            <dt>Trust</dt><dd>{open.trust}</dd>
            <dt>Risk</dt><dd><RiskChip r={open.risk} /></dd>
          </dl>
          {open.discovered && (
            <div className="card" style={{ marginTop: 12, borderColor: "var(--bad)" }}>
              <b className="small">Why this appears here</b>
              <div className="small dim">
                Wrapbox observed an unregistered MCP server (tcp/7823) initiating external transfers from Finance-Laptop-07.
                Observation never widens authority — this agent has no granted permissions, and its external destinations
                are evaluated as UNKNOWN_EXTERNAL (fail-safe).
              </div>
            </div>
          )}
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Recent decisions for this agent</h3>
          <div className="small">
            {s.events.filter((e) => e.agent === open.id).slice(-6).reverse().map((e) => (
              <div key={e.id} className="stream-item">
                <span className="stream-text mono small">{e.actionRaw ?? e.action} → {e.resource}</span>
                <DecisionChip d={e.decision} small />
              </div>
            ))}
            {s.events.filter((e) => e.agent === open.id).length === 0 && <div className="empty">No recorded activity.</div>}
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn btn-sm" onClick={() => { setOpen(null); nav("trust"); }}>View in Trust Graph</button>
            <button className="btn btn-sm" onClick={() => { setOpen(null); nav("evidence"); }}>Open Evidence</button>
          </div>
        </Drawer>
      )}

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 14, marginBottom: 8 }}>Agent activity</h2>
        <EventStream events={s.events} nav={nav} compact limit={10} filters={false} />
      </div>
    </div>
  );
}
