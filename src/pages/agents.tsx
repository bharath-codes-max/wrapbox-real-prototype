// Agent Inventory — every detected agent with identity, tools, destinations,
// risk and per-agent activity derived from the shared event store.
import { useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, RiskChip, SimNote, Drawer, DecisionChip, timeAgo, AgentMark, Avatar } from "../ui/kit";
import { EventStream } from "../ui/event-stream";
import { describe } from "../ui/describe";
import { AGENTS, deviceById, userById, type OrgAgent } from "../model/org";
import { destById } from "../model/registries";
import { Bot, ShieldAlert, ShieldCheck, Activity, ArrowRight } from "lucide-react";

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

  // Who actually used each agent, and on which laptop — derived from events.
  const usersOf = (id: string) => {
    const seen = new Map<string, string>();
    for (const e of s.events) if (e.agent === id && !seen.has(e.user)) seen.set(e.user, e.device);
    return [...seen.entries()].map(([user, device]) => ({ user, device }));
  };

  const registered = AGENTS.filter((a) => !a.discovered).length;
  const discovered = AGENTS.filter((a) => a.discovered).length;
  const trusted = AGENTS.filter((a) => a.trust === "trusted").length;
  const totalEvents = s.events.length;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Activity"
        title="Agent Inventory"
        sub="Automatically discovered agents, applications and tools — including shadow agents nobody registered. Identity: user + device + agent + tool feeds every decision."
        right={<SimNote>Discovery simulated · inventory model real</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Bot size={17} />} label="Agents detected" value={AGENTS.length} note={`${registered} registered`} />
        <Stat icon={<ShieldAlert size={17} />} label="Shadow agents" value={discovered} tone={discovered > 0 ? "bad" : "good"} note={discovered > 0 ? "discovered, unregistered" : "none observed"} />
        <Stat icon={<ShieldCheck size={17} />} label="Trusted" value={trusted} tone="good" note="full trust posture" />
        <Stat icon={<Activity size={17} />} label="Decisions evaluated" value={totalEvents} note="across every plane" onClick={() => nav("live")} />
      </div>

      <div className="section">
        <SectionHead title="Inventory" sub="Every agent Wrapbox has identified, with owner, reach and current risk posture" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th><th>Provider</th><th>Owner</th><th>Used by</th><th>Tools</th>
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
                    <td className="small">
                      {usersOf(a.id).length === 0 ? <span className="faint">nobody yet</span> : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {usersOf(a.id).map((u) => (
                            <span key={u.user} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                              <Avatar userId={u.user} size={18} />{userById(u.user)?.name ?? u.user}
                            </span>
                          ))}
                        </div>
                      )}
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
            <dt>Owner</dt><dd>{open.owner ? `${userById(open.owner)?.name} (registered it, accountable)` : "unknown — no registered owner"}</dd>
            <dt>Registered on</dt><dd>{open.device ? deviceById(open.device)?.name : "—"}</dd>
            <dt>Used by</dt>
            <dd>
              {usersOf(open.id).length === 0 ? "nobody yet" : usersOf(open.id).map((u) => (
                <div key={u.user} className="row" style={{ gap: 6 }}>
                  <Avatar userId={u.user} size={18} />{userById(u.user)?.name ?? u.user}
                  <span className="faint">on {deviceById(u.device)?.name ?? u.device}</span>
                </div>
              ))}
            </dd>
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
                <span className="stream-text">
                  <span className="stream-sentence">{describe(e)}</span>
                  <span className="stream-meta">
                    <span className="stream-who"><Avatar userId={e.user} size={16} />{userById(e.user)?.name ?? e.user}</span>
                    <span className="sep">·</span>{timeAgo(e.timestamp)}
                    <span className="sep">·</span><span className="mono">{e.action}</span>
                  </span>
                </span>
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

      <div className="section">
        <SectionHead title="Agent activity" sub="The live decision stream across all agents, newest first" right={<button className="btn btn-sm" onClick={() => nav("live")}>Live Actions <ArrowRight size={13} /></button>} />
        <div className="card card-pad-0">
          <EventStream events={s.events} nav={nav} compact limit={10} filters={false} bare />
        </div>
      </div>
    </div>
  );
}
