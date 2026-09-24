// Trust Graph — relationships between users, devices, agents, tools and
// resources/destinations, with new/risky edges highlighted. Pure SVG.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, Chip, SimNote } from "../ui/kit";
import { AGENTS, USERS, resourceById, userById } from "../model/org";
import { destById } from "../model/registries";

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
    USERS.forEach((u, i) => nodes.push({ id: u.id, label: u.name, kind: "user", x: 90, y: 70 + i * 92 }));
    AGENTS.forEach((a, i) => nodes.push({ id: a.id, label: a.name, kind: "agent", x: 390, y: 46 + i * 52, risky: a.discovered }));
    const targets = new Map<string, Node>();
    let ti = 0;
    const targetNode = (id: string, label: string, kind: "resource" | "dest", risky = false) => {
      if (!targets.has(id)) {
        const n: Node = { id, label, kind, x: 700, y: 46 + ti * 46, risky };
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
        const r = resourceById(e.resource);
        addEdge(e.agent, targetNode(e.resource, r?.name ?? e.resource, "resource"), risky);
      }
    }
    return { nodes, edges };
  }, [s.events]);

  const height = Math.max(480, ...nodes.map((n) => n.y + 50));
  const colors = { user: "#5b8def", agent: "#a78bfa", resource: "#34c98e", dest: "#e8b542" };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const selEdges = selected ? edges.filter((e) => e.from === selected || e.to === selected) : edges;

  return (
    <div className="page">
      <PageHead
        title="Trust Graph"
        sub="Who talks to what: users → agents → tools → resources and destinations, built from observed events. Red edges carry high-risk activity; amber nodes are unknown/unclassified."
        right={<SimNote />}
      />
      <div className="row" style={{ marginBottom: 10 }}>
        <Chip tone="constrain">● users</Chip><Chip tone="violet">● agents</Chip>
        <Chip tone="allow">● resources</Chip><Chip tone="review">● destinations</Chip>
        <Chip tone="block">— high-risk edge</Chip>
        {selected && <button className="btn btn-sm btn-ghost" onClick={() => setSelected(null)}>clear focus</button>}
      </div>
      <div className="card">
        <svg className="tg-svg" viewBox={`0 0 800 ${height}`}>
          {selEdges.map((e, i) => {
            const a = byId.get(e.from); const b = byId.get(e.to);
            if (!a || !b) return null;
            const mx = (a.x + b.x) / 2;
            return (
              <g key={i}>
                <path
                  d={`M ${a.x + 8} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x - 8} ${b.y}`}
                  fill="none"
                  stroke={e.risky ? "#ef5f74" : "#2f3950"}
                  strokeWidth={Math.min(4, 1 + e.count * 0.4)}
                  opacity={selected && !(e.from === selected || e.to === selected) ? 0.15 : 0.85}
                />
              </g>
            );
          })}
          {nodes.map((n) => (
            <g key={n.id} className="tg-node" onClick={() => setSelected(selected === n.id ? null : n.id)}
               opacity={selected && n.id !== selected && !edges.some((e) => (e.from === selected && e.to === n.id) || (e.to === selected && e.from === n.id)) ? 0.3 : 1}>
              <circle cx={n.x} cy={n.y} r={n.id === selected ? 10 : 7}
                fill={n.risky ? "#ef5f74" : colors[n.kind]}
                stroke={n.risky ? "#ef5f74" : "none"} strokeWidth={n.risky ? 6 : 0} strokeOpacity={0.25} />
              <text className="tg-label" x={n.kind === "user" ? n.x - 12 : n.x + 12} y={n.y + 3}
                textAnchor={n.kind === "user" ? "end" : "start"}
                style={{ fill: n.risky ? "#ef5f74" : undefined, fontWeight: n.risky ? 700 : 400 }}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {nodes.some((n) => n.risky) && (
        <div className="card" style={{ marginTop: 10, borderColor: "var(--bad)" }}>
          <b className="small">Risky relationship detected:</b>{" "}
          <span className="small dim">
            an unregistered MCP agent on Finance-Laptop-07 holds edges to an unknown external endpoint. Its transfers were
            blocked by the Safety Kernel — inspect it in <a onClick={() => nav("agents")}>Agent Inventory</a>.
          </span>
        </div>
      )}
    </div>
  );
}
