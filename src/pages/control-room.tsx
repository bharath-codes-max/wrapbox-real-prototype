// Control Room — executive/operations dashboard. Every number derives from
// the event store; every metric is clickable to its inspectable source.
import { useAppState, metrics } from "../state/store";
import { PageHead, MetricBar, StatusChip, SimNote, SectionHead } from "../ui/kit";
import { EventStream } from "../ui/event-stream";
import { AGENTS, DEVICES } from "../model/org";
import { CAPABILITIES } from "../model/registries";
import { ShieldCheck, Network, Server, ArrowRight } from "lucide-react";

const DECISIONS = [
  { key: "ALLOW", label: "Allowed", tone: "allow", route: "live", note: "flowed automatically" },
  { key: "CONSTRAIN", label: "Constrained", tone: "constrain", route: "live", note: "transformed in-flight" },
  { key: "REVIEW", label: "Reviewed", tone: "review", route: "reviews", note: "escalated to a human" },
  { key: "BLOCK", label: "Blocked", tone: "block", route: "live", note: "stopped before execution" },
] as const;

export function ControlRoom({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = metrics(s);
  const activeAgents = AGENTS.filter((a) => !a.discovered).length;
  const discovered = AGENTS.filter((a) => a.discovered).length;
  const parked = s.events.filter((e) => e.status === "parked").length;
  const totalDecided = DECISIONS.reduce((n, d) => n + m.counts[d.key], 0) || 1;
  const planeStatus = (plane: string) => {
    const caps = CAPABILITIES.filter((c) => c.plane === plane);
    return { enforced: caps.filter((c) => c.status === "ENFORCED").length, total: caps.length };
  };
  const planeMeta = {
    ENDPOINT: { icon: <Server size={16} strokeWidth={1.75} />, blurb: "Local device actions — file, process, secrets" },
    NETWORK: { icon: <Network size={16} strokeWidth={1.75} />, blurb: "Outbound & inbound traffic — HTTPS, uploads, AI destinations" },
    GATEWAY: { icon: <ShieldCheck size={16} strokeWidth={1.75} />, blurb: "External systems — GitHub, SQL, cloud, MCP" },
  } as const;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Overview"
        title="Control Room"
        sub={`Veridian Systems · ${activeAgents} registered agents · ${DEVICES.length} protected devices. Every figure below is computed from live event state — select any metric to inspect its source.`}
        right={<SimNote />}
      />

      <MetricBar band items={[
        { label: "Active agents", value: activeAgents, note: discovered > 0 ? `+${discovered} discovered, unregistered` : "all registered", onClick: () => nav("agents") },
        { label: "Pending reviews", value: m.pendingReviews, tone: m.pendingReviews > 0 ? "warn" : "good", note: parked > 0 ? `${parked} task step(s) parked` : "no parked steps", onClick: () => nav("reviews") },
        { label: "Secrets protected", value: m.secretsProtected, tone: "good", note: "credential exfiltration blocked", onClick: () => nav("evidence") },
        { label: "High-risk events", value: m.highRisk, tone: m.highRisk > 0 ? "bad" : "good", note: "risk ≥ high, all planes", onClick: () => nav("evidence") },
      ]} />

      <div className="section">
        <SectionHead title="Decision mix" sub={`How ${totalDecided} consequential actions resolved across every plane`} />
        <div className="decisionbar">
          <div className="decision-track">
            {DECISIONS.map((d) => {
              const c = m.counts[d.key];
              if (c === 0) return null;
              return (
                <div key={d.key} className="decision-seg" style={{ flex: c, background: `var(--${d.tone})` }} onClick={() => nav(d.route)} title={`${d.label}: ${c}`}>
                  {c / totalDecided > 0.06 && <span>{c}</span>}
                </div>
              );
            })}
          </div>
          <div className="decision-legend">
            {DECISIONS.map((d) => (
              <div key={d.key} className="decision-leg" onClick={() => nav(d.route)}>
                <span className="dot" style={{ background: `var(--${d.tone})` }} />
                <span className="n" style={{ color: `var(--${d.tone})` }}>{m.counts[d.key]}</span>
                <span className="lbl">{d.label} · {d.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Enforcement planes" sub="One Core Brain, three enforcement arms" right={<button className="btn btn-sm" onClick={() => nav("coverage")}>Coverage Map <ArrowRight size={13} /></button>} />
        <div className="grid g3">
          {(["ENDPOINT", "NETWORK", "GATEWAY"] as const).map((p) => {
            const st = planeStatus(p);
            return (
              <div className="card clickable-card" key={p} onClick={() => nav("coverage")}>
                <div className="spread" style={{ alignItems: "center" }}>
                  <span className="row" style={{ gap: 9 }}>
                    <span className="plane-icon">{planeMeta[p].icon}</span>
                    <b style={{ fontSize: 14.5, letterSpacing: "-0.01em" }}>{p.charAt(0) + p.slice(1).toLowerCase()} plane</b>
                  </span>
                  <StatusChip s={st.enforced === st.total ? "ENFORCED" : "DEGRADED"} />
                </div>
                <div className="small dim" style={{ marginTop: 10, lineHeight: 1.5 }}>{planeMeta[p].blurb}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 16 }}>
                  {CAPABILITIES.filter((c) => c.plane === p).slice(0, 3).map((c) => (
                    <div key={c.id} className="spread" style={{ gap: 8 }}>
                      <span className="small faint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                      <StatusChip s={c.status} />
                    </div>
                  ))}
                </div>
                <div className="small faint tnum" style={{ marginTop: 14 }}>{st.enforced} of {st.total} skills enforced</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <SectionHead title="Recent activity" sub="The live decision stream, newest first" right={<button className="btn btn-sm" onClick={() => nav("live")}>Live Actions <ArrowRight size={13} /></button>} />
        <EventStream events={s.events} nav={nav} compact limit={8} filters={false} bare />
      </div>
    </div>
  );
}
