// Control Room — executive/operations dashboard. Every number derives from
// the event store; every metric is clickable to its inspectable source.
import { useAppState, metrics } from "../state/store";
import { PageHead, MetricBar, StatusChip, SimNote, SectionHead, PageTabs, EntityCard, CardGrid } from "../ui/kit";
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
        sub={`${s.org.company} · ${activeAgents} registered agents · ${DEVICES.length} protected devices. Every figure below is computed from live event state — select any metric to inspect its source.`}
        right={<SimNote />}
      />

      <div className="card overview-card">
        <MetricBar band items={[
          { label: "Active agents", value: activeAgents, note: discovered > 0 ? `+${discovered} discovered, unregistered` : "all registered", onClick: () => nav("agents") },
          { label: "Pending reviews", value: m.pendingReviews, tone: m.pendingReviews > 0 ? "warn" : "good", note: parked > 0 ? `${parked} task step(s) parked` : "no parked steps", onClick: () => nav("reviews") },
          { label: "Secrets protected", value: m.secretsProtected, tone: "good", note: "credential exfiltration blocked", onClick: () => nav("evidence") },
          { label: "High-risk events", value: m.highRisk, tone: m.highRisk > 0 ? "bad" : "good", note: "risk ≥ high, all planes", onClick: () => nav("evidence") },
        ]} />
        <div className="overview-sep" />
        <div className="overview-decision">
          <div className="row spread" style={{ marginBottom: 12 }}>
            <span className="eyebrow">Decision mix · {totalDecided} actions</span>
            <button className="btn btn-ghost btn-sm" onClick={() => nav("live")}>Live Actions <ArrowRight size={13} /></button>
          </div>
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

      <PageTabs storageKey="control" tabs={[
        { id: "activity", label: "Recent activity", count: Math.min(8, s.events.length), content: (
      <div>
        <SectionHead title="Recent activity" sub="The live decision stream, newest first" right={<button className="btn btn-sm" onClick={() => nav("live")}>Live Actions <ArrowRight size={13} /></button>} />
        <EventStream events={s.events} nav={nav} compact limit={8} filters={false} bare />
      </div>
        ) },
        { id: "planes", label: "Enforcement planes", count: 3, content: (
      <div>
        <SectionHead title="Enforcement planes" sub="One Core Brain, three enforcement arms" right={<button className="btn btn-sm" onClick={() => nav("coverage")}>Coverage Map <ArrowRight size={13} /></button>} />
        <CardGrid cols={3}>
          {(["ENDPOINT", "NETWORK", "GATEWAY"] as const).map((p) => {
            const st = planeStatus(p);
            return (
              <EntityCard
                key={p}
                onClick={() => nav("coverage")}
                icon={<span className="plane-icon">{planeMeta[p].icon}</span>}
                eyebrow={planeMeta[p].blurb}
                title={`${p.charAt(0) + p.slice(1).toLowerCase()} plane`}
                status={<StatusChip s={st.enforced === st.total ? "ENFORCED" : "DEGRADED"} />}
                fields={[
                  ...CAPABILITIES.filter((c) => c.plane === p).slice(0, 3).map((c) => ({ label: c.label, value: <StatusChip s={c.status} /> })),
                  { label: "Skills enforced", value: <span className="tnum">{st.enforced} of {st.total}</span> },
                ]}
              />
            );
          })}
        </CardGrid>
      </div>
        ) },
      ]} />
    </div>
  );
}
