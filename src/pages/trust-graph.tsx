// Trust Graph — relationships between users, devices, agents, tools and
// resources/destinations, with new/risky edges highlighted. Pure SVG.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, SectionHead, Chip, SimNote, MetricBar, AgentMark, DestMark } from "../ui/kit";
import { AGENTS, USERS, resourceById, userById } from "../model/org";
import { destById } from "../model/registries";
import { ShieldAlert } from "lucide-react";

interface Node { id: string; label: string; kind: "user" | "agent" | "resource" | "dest"; x: number; y: number; risky?: boolean }
interface Edge { from: string; to: string; label?: string; risky?: boolean; count: number }

export function TrustGraph({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const eKey = new Map<string, Edge>();
    const addEdge = (from: string, to: string, risky: boolean) => {
      const k = `${from}→${to}`;
      const e = eKey.get(k);
      if (e) { e.count += 1; e.risky = e.risky || risky; }
      else { const ne = { from, to, risky, count: 1 }; eKey.set(k, ne); edges.push(ne); }
    };
    // Columns: users | agents | resources+destinations
    USERS.forEach((u, i) => nodes.push({ id: u.id, label: u.name, kind: "user", x: 100, y: 70 + i * 92 }));
    AGENTS.forEach((a, i) => nodes.push({ id: a.id, label: a.name, kind: "agent", x: 370, y: 46 + i * 52, risky: a.discovered }));
    const targets = new Map<string, Node>();
    let ti = 0;
    const targetNode = (id: string, label: string, kind: "resource" | "dest", risky = false) => {
      if (!targets.has(id)) {
        const n: Node = { id, label, kind, x: 640, y: 46 + ti * 46, risky };
        targets.set(id, n); nodes.push(n); ti += 1;
      } else if (risky) targets.get(id)!.risky = true;
      return id;
    };
    for (const e of s.events) {
      if (userById(e.user) && AGENTS.some((a) => a.id === e.agent)) addEdge(e.user, e.agent, false);
      const risky = e.risk === "high" || e.risk === "critical";
      if (e.destination) {
        const d = destById(e.destination);
        addEdge(e.agent, targetNode(e.destination, d?.label ?? e.destination, "dest", e.destinationClass === "UNKNOWN_EXTERNAL"), risky);
      } else {
        // Events may name a resource by id ("r-checkout") or by name
        // ("checkout-service"); key by the resolved name so it is one dot.
        const name = resourceById(e.resource)?.name ?? e.resource;
        addEdge(e.agent, targetNode(`res:${name}`, name, "resource"), risky);
      }
    }
    return { nodes, edges };
  }, [s.events]);

  const height = Math.max(480, ...nodes.map((n) => n.y + 50));
  const colors = { user: "#5b8def", agent: "#a78bfa", resource: "#34c98e", dest: "#e8b542" };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const selEdges = selected ? edges.filter((e) => e.from === selected || e.to === selected) : edges;

  // Derived summary — counts read straight from the graph, never typed in.
  const userCount = nodes.filter((n) => n.kind === "user").length;
  const agentCount = nodes.filter((n) => n.kind === "agent").length;
  const targetCount = nodes.filter((n) => n.kind === "resource" || n.kind === "dest").length;
  const riskyEdges = edges.filter((e) => e.risky).length;
  const riskyAgents = nodes.filter((n) => n.kind === "agent" && n.risky).length;
  const agentNodes = nodes.filter((n) => n.kind === "agent");

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Visibility"
        title="Trust Graph"
        sub="Who talks to what: users → agents → tools → resources and destinations, built from observed events. Red lines carry high-risk activity; red dots are strangers (unregistered agents or unknown addresses)."
        right={<SimNote />}
      />

      {/* Hero — the relationship map is the point of this page. */}
      <div className="section" style={{ marginTop: 4 }}>
        <SectionHead
          title="Relationship map"
          sub="Every edge is an observed event; thicker lines carry more traffic. Click any node to focus its neighbourhood."
          right={selected ? <button className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>Clear focus</button> : undefined}
        />
        <div className="card">
          <div className="tg-canvas">
          <svg className="tg-svg" viewBox={`0 0 860 ${height}`}>
            <defs>
              <filter id="tg-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="3.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {(Object.entries(colors) as [keyof typeof colors, string][]).map(([k, c]) => (
                <radialGradient key={k} id={`tg-${k}`} cx="35%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="45%" stopColor={c} />
                  <stop offset="100%" stopColor={c} stopOpacity="0.85" />
                </radialGradient>
              ))}
              <radialGradient id="tg-risk" cx="35%" cy="35%" r="75%">
                <stop offset="0%" stopColor="#ffd5da" />
                <stop offset="45%" stopColor="#ff5a6e" />
                <stop offset="100%" stopColor="#e0324a" />
              </radialGradient>
            </defs>

            {/* Column captions */}
            <text className="tg-col-head" x="100" y="24" textAnchor="middle">People</text>
            <text className="tg-col-head" x="370" y="24" textAnchor="middle">AI agents</text>
            <text className="tg-col-head" x="640" y="24" textAnchor="middle">Resources &amp; destinations</text>

            {/* Edges — glowing curved links */}
            {selEdges.map((e, i) => {
              const a = byId.get(e.from); const b = byId.get(e.to);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const dim = selected && !(e.from === selected || e.to === selected);
              return (
                <path
                  key={i}
                  d={`M ${a.x + 9} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 9} ${b.y}`}
                  fill="none"
                  stroke={e.risky ? "#ff5a6e" : "#5f83c4"}
                  strokeWidth={Math.min(4, 1 + e.count * 0.45)}
                  strokeLinecap="round"
                  opacity={dim ? 0.08 : e.risky ? 0.9 : 0.4}
                  filter={e.risky && !dim ? "url(#tg-glow)" : undefined}
                />
              );
            })}

            {/* Nodes — glowing orbs */}
            {nodes.map((n) => {
              const focused = selected === n.id;
              const connected = selected && edges.some((e) => (e.from === selected && e.to === n.id) || (e.to === selected && e.from === n.id));
              const faded = selected && !focused && !connected;
              const r = focused ? 11 : n.kind === "agent" ? 8.5 : 7;
              const fill = n.risky ? "url(#tg-risk)" : `url(#tg-${n.kind})`;
              const glow = n.risky ? "#ff5a6e" : colors[n.kind];
              return (
                <g key={n.id} className="tg-node" onClick={() => setSelected(focused ? null : n.id)} opacity={faded ? 0.28 : 1}>
                  <circle cx={n.x} cy={n.y} r={r + 7} fill={glow} opacity={n.risky ? 0.34 : 0.16} filter="url(#tg-glow)" />
                  <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke="rgba(255,255,255,0.55)" strokeWidth={focused ? 1.6 : 1} />
                  <text className="tg-label" x={n.kind === "user" ? n.x - 13 : n.x + 13} y={n.y + 3.5}
                    textAnchor={n.kind === "user" ? "end" : "start"}
                    style={{ fill: n.risky ? "#ff8f9c" : undefined, fontWeight: n.risky || focused ? 600 : 400 }}>
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
          </div>

          {/* Legend + observed-agent marks, sitting on the hero card. */}
          <div className="spread" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)", gap: 12 }}>
            <div className="row" style={{ gap: 4 }}>
              {([["users", colors.user], ["agents", colors.agent], ["resources", colors.resource], ["destinations", colors.dest], ["stranger", "#ef5f74"]] as const).map(([label, c]) => (
                <span key={label} className="legend-item"><span className="legend-dot" style={{ background: c }} />{label}</span>
              ))}
              <span className="legend-item"><span className="legend-line" />high-risk line</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="faint small">Agents in scope</span>
              <div className="row" style={{ gap: 5 }}>
                {agentNodes.map((n) => (
                  <span key={n.id} title={n.label} style={{ display: "inline-flex", opacity: n.risky ? 1 : 0.9 }}>
                    <AgentMark agentId={n.id} size={18} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* At-a-glance strip — small, refined numbers, not big boxes. */}
      <div className="section">
        <div className="card">
          <MetricBar
            band
            items={[
              { label: "Identities", value: userCount, note: "human principals observed" },
              { label: "Agents", value: agentCount, tone: riskyAgents > 0 ? "warn" : undefined, note: riskyAgents > 0 ? `${riskyAgents} unregistered (stranger)` : "all registered", onClick: () => nav("agents") },
              { label: "Resources & destinations", value: targetCount, note: "tools, files and endpoints reached" },
              { label: "High-risk edges", value: riskyEdges, tone: riskyEdges > 0 ? "bad" : "good", note: "relationships carrying high/critical activity", onClick: () => nav("evidence") },
            ]}
          />
        </div>
      </div>

      {nodes.some((n) => n.risky) && (
        <div className="section">
          <SectionHead title="Flagged relationship" sub="Edges the Safety Kernel is watching" />
          <div className="card" style={{ borderColor: "var(--bad)" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
              <div className="stat-icon" style={{ color: "var(--bad)", background: "var(--bad-soft)", flexShrink: 0 }}><ShieldAlert size={17} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="spread" style={{ gap: 8 }}>
                  <b className="small">Risky relationship detected</b>
                  <div className="row" style={{ gap: 6 }}>
                    {riskyAgents > 0 && <Chip tone="critical">{riskyAgents} stranger agent{riskyAgents === 1 ? "" : "s"}</Chip>}
                    {riskyEdges > 0 && <Chip tone="block">{riskyEdges} high-risk edge{riskyEdges === 1 ? "" : "s"}</Chip>}
                  </div>
                </div>
                <div className="small dim" style={{ marginTop: 6, lineHeight: 1.5 }}>
                  An unregistered MCP agent on Finance-Laptop-07 holds edges to an unknown external endpoint. Its transfers were
                  blocked by the Safety Kernel — inspect it in <a onClick={() => nav("agents")}>Agent Inventory</a>.
                </div>
                <div className="row" style={{ gap: 10, marginTop: 12 }}>
                  <span className="row" style={{ gap: 6 }}><AgentMark agentId="a-unknown-mcp" size={16} /><span className="mono small faint">a-unknown-mcp</span></span>
                  <span className="faint">→</span>
                  <span className="row" style={{ gap: 6 }}><DestMark destId="dest-unknown" size={16} /><span className="mono small faint">unknown endpoint</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
