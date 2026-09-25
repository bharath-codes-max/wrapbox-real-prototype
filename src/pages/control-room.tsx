// Control Room — executive/operations dashboard. Every number derives from
// the event store; every metric is clickable to its inspectable source.
import { useAppState, metrics } from "../state/store";
import { PageHead, MetricBar, Chip, StatusChip, SimNote, SectionHead } from "../ui/kit";
import { EventStream } from "../ui/event-stream";
import { AGENTS, DEVICES } from "../model/org";
import { CAPABILITIES } from "../model/registries";
import { ShieldCheck, Network, Server, ArrowRight } from "lucide-react";

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
  const planeMeta = {
    ENDPOINT: { icon: <Server size={17} />, blurb: "Local device actions — file, process, secrets" },
    NETWORK: { icon: <Network size={17} />, blurb: "Outbound & inbound traffic — HTTPS, uploads, AI destinations" },
    GATEWAY: { icon: <ShieldCheck size={17} />, blurb: "External systems — GitHub, SQL, cloud, MCP" },
  } as const;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Overview"
        title="Control Room"
        sub={`Veridian Systems · ${activeAgents} registered agents · ${DEVICES.length} protected devices. Every figure below derives from live event state — click any metric to inspect its source.`}
        right={<SimNote />}
      />

      <MetricBar items={[
        { label: "Active agents", value: activeAgents, note: discovered > 0 ? `+${discovered} discovered, unregistered` : "all registered", onClick: () => nav("agents") },
        { label: "Pending reviews", value: m.pendingReviews, tone: m.pendingReviews > 0 ? "warn" : "good", note: parked > 0 ? `${parked} task step(s) parked` : "no parked steps", onClick: () => nav("reviews") },
        { label: "Secrets protected", value: m.secretsProtected, tone: "good", note: "credential exfiltration blocked", onClick: () => nav("evidence") },
        { label: "High-risk events", value: m.highRisk, tone: m.highRisk > 0 ? "bad" : "good", note: "risk ≥ high, all planes", onClick: () => nav("evidence") },
      ]} />

      <div className="section">
        <SectionHead title="Decision mix" sub="How consequential actions resolved across every plane" />
        <MetricBar items={[
          { label: "Allowed", value: m.counts.ALLOW, tone: "good", note: "normal work flowed automatically", onClick: () => nav("live") },
          { label: "Constrained", value: m.counts.CONSTRAIN, tone: "info", note: `${m.transfersTransformed} sensitive transfer(s) transformed`, onClick: () => nav("live") },
          { label: "Reviewed", value: m.counts.REVIEW, tone: "warn", note: "exceptions escalated to humans", onClick: () => nav("reviews") },
          { label: "Blocked", value: m.counts.BLOCK, tone: "bad", note: "stopped before execution", onClick: () => nav("live") },
        ]} />
      </div>

      <div className="section">
        <SectionHead title="Enforcement planes" sub="One Core Brain, three enforcement arms" right={<button className="btn btn-sm" onClick={() => nav("coverage")}>Coverage Map <ArrowRight size={13} /></button>} />
        <div className="grid g3">
          {(["ENDPOINT", "NETWORK", "GATEWAY"] as const).map((p) => {
            const st = planeStatus(p);
            return (
              <div className="card stat clickable" key={p} onClick={() => nav("coverage")}>
                <div className="stat-top">
                  <div className="stat-icon">{planeMeta[p].icon}</div>
                  <Chip tone={st.enforced === st.total ? "enforced" : "degraded"}>{st.enforced}/{st.total} enforced</Chip>
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>{p.charAt(0) + p.slice(1).toLowerCase()} plane</div>
                <div className="small dim" style={{ marginTop: 4, lineHeight: 1.5 }}>{planeMeta[p].blurb}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
                  {CAPABILITIES.filter((c) => c.plane === p).slice(0, 3).map((c) => (
                    <div key={c.id} className="spread" style={{ gap: 8 }}>
                      <span className="small faint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.label}</span>
                      <StatusChip s={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <SectionHead title="Recent activity" sub="The live decision stream, newest first" right={<button className="btn btn-sm" onClick={() => nav("live")}>Live Actions <ArrowRight size={13} /></button>} />
        <div className="card card-pad-0">
          <EventStream events={s.events} nav={nav} compact limit={8} filters={false} bare />
        </div>
      </div>
    </div>
  );
}
