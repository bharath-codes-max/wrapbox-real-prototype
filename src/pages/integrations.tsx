// Integrations — simulated enterprise connections. Each connection's status is
// derived from the capability registry (the same one Coverage uses), and its
// usage from the recorded events; nothing here is a typed-in figure.
import { useAppState } from "../state/store";
import { PageHead, Chip, StatusChip, SimNote, SectionHead, Stat, DecisionChip, names } from "../ui/kit";
import { RESOURCES, DEVICES, USERS, AGENTS, deviceById, userById } from "../model/org";
import { ACTION_NORMALIZATION, CAPABILITIES } from "../model/registries";
import { logoUrl } from "../ui/logos";
import { describe } from "../ui/describe";
import type { SimulationEvent } from "../model/types";
import { Plug, ShieldCheck, AlertTriangle, Radar, Fingerprint, Shuffle, ArrowRight } from "lucide-react";

interface Connection {
  name: string; logo: string; kind: string; caps: string[]; detail: string;
  uses: (e: SimulationEvent) => boolean;
}

const enrolled = DEVICES.filter((d) => d.enrolled).length;
const discovered = AGENTS.filter((a) => a.discovered).length;

const CONNECTIONS: Connection[] = [
  { name: "GitHub Organization", logo: "github_light", kind: "Gateway connector", caps: ["cap-gw-github"],
    detail: "github.com/veridian · push, PR and branch operations on checkout-service",
    uses: (e) => e.application === "GitHub MCP" || (e.plane === "GATEWAY" && e.resource === "r-checkout") },
  { name: "PostgreSQL gateway", logo: "postgresql", kind: "Gateway connector", caps: ["cap-gw-sql"],
    detail: "payments-prod, customer-db · query preflight + row estimates",
    uses: (e) => e.application === "SQL MCP" || e.resource === "r-customer-db" || e.resource === "r-payments-prod" },
  { name: "AWS", logo: "aws", kind: "Gateway connector", caps: ["cap-gw-cloud"],
    detail: "Production and staging accounts",
    uses: (e) => e.application === "AWS API" || e.resource.startsWith("r-aws") },
  { name: "Stripe & support desk", logo: "stripe", kind: "Gateway connector", caps: ["cap-gw-saas"],
    detail: "Refunds, tickets and customer replies",
    uses: (e) => e.application === "Stripe API" || e.application === "Support SaaS API" || e.resource === "r-stripe" },
  { name: "macOS Endpoint runtime", logo: "wrapbox-icon", kind: "Endpoint plane", caps: ["cap-ep-file", "cap-ep-exec", "cap-ep-clipboard"],
    detail: `${enrolled} enrolled devices · file and process authorization`,
    uses: (e) => e.plane === "ENDPOINT" },
  { name: "Network Extension", logo: "wrapbox-icon", kind: "Network plane", caps: ["cap-net-https", "cap-net-quic", "cap-net-websocket", "cap-net-file"],
    detail: "What leaves each device for AI tools and other sites",
    uses: (e) => e.plane === "NETWORK" },
  { name: "MCP registry", logo: "mcp", kind: "Gateway connector", caps: ["cap-gw-mcp"],
    detail: `${discovered} unknown MCP server${discovered === 1 ? "" : "s"} discovered, not registered`,
    uses: (e) => !!AGENTS.find((a) => a.id === e.agent)?.discovered },
];

const RANK: Record<string, number> = { ENFORCED: 0, DEGRADED: 1, UNDERSTOOD_ONLY: 2, UNINSPECTABLE: 3 };
const capOf = (id: string) => CAPABILITIES.find((c) => c.id === id)!;
/** Worst live capability; planned (PENDING) ones are listed but don't count yet. */
function statusOf(c: Connection): string {
  const live = c.caps.map(capOf).filter((x) => x.status !== "PENDING");
  return live.reduce((w, x) => ((RANK[x.status] ?? 0) > (RANK[w] ?? 0) ? x.status : w), "ENFORCED");
}

export function IntegrationsPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const statuses = CONNECTIONS.map(statusOf);
  const enforced = statuses.filter((x) => x === "ENFORCED").length;
  const degraded = statuses.filter((x) => x === "DEGRADED").length;
  const understood = statuses.filter((x) => x === "UNDERSTOOD_ONLY").length;
  const used = (c: Connection) => s.events.filter(c.uses).length;

  // A real identity chain: the latest recorded action on the checkout code (the root), else the latest action.
  const byTime = [...s.events].sort((a, b) => b.timestamp - a.timestamp);
  const sample = byTime.find((e) => /checkout/i.test(names(e).resource)) ?? byTime[0];

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="System"
        title="Integrations"
        sub="The places Wrapbox sits to see and stop agent actions. Each status comes from the capability list Coverage uses; each count comes from your recorded actions."
        right={<SimNote>All connections simulated</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Plug size={17} />} label="Connections" value={CONNECTIONS.length} note={`plus Okta SSO · ${USERS.length} users`} />
        <Stat icon={<ShieldCheck size={17} />} label="Enforced" value={enforced} tone="good" note="can stop actions inline" onClick={() => nav("coverage")} />
        <Stat icon={<AlertTriangle size={17} />} label="Degraded" value={degraded} tone={degraded > 0 ? "warn" : "good"} note="some parts only watched" onClick={() => nav("coverage")} />
        <Stat icon={<Radar size={17} />} label="Understood only" value={understood} tone={understood > 0 ? "info" : "good"} note="watched, can't stop yet" onClick={() => nav("coverage")} />
      </div>

      <div className="section">
        <SectionHead title="Connected systems" sub="What each one can do today, and how many of your recorded actions went through it" />
        <div className="grid g2">
          {CONNECTIONS.map((c, i) => (
            <div className="card" key={c.name}>
              <div className="spread">
                <span className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                  <img src={logoUrl(c.logo)} alt="" className="logo-lg" />
                  <b>{c.name}</b>
                </span>
                <StatusChip s={statuses[i]} />
              </div>
              <div className="small faint" style={{ marginTop: 10 }}>{c.kind} · {c.detail}</div>
              <ul className="small dim" style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                {c.caps.map(capOf).map((cap) => (
                  <li key={cap.id}>
                    <b>{cap.label}</b> — {cap.status === "PENDING" ? "planned" : cap.status.replaceAll("_", " ").toLowerCase()}: {cap.note}
                  </li>
                ))}
              </ul>
              <div className="small" style={{ marginTop: 8 }}>
                <b>{used(c)}</b> recorded action{used(c) === 1 ? "" : "s"} went through this
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <SectionHead title="Governed resources" sub="The systems policy is written against, with environment and sensitivity" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Resource</th><th>Kind</th><th>Environment</th><th>Sensitivity</th><th>Detail</th></tr></thead>
            <tbody>
              {RESOURCES.map((r) => (
                <tr key={r.id}>
                  <td><b className="small">{r.name}</b></td>
                  <td className="small">{r.kind}</td>
                  <td><Chip tone={r.environment === "production" ? "review" : "neutral"}>{r.environment}</Chip></td>
                  <td><Chip tone={r.sensitivity === "customer-impacting" ? "critical" : r.sensitivity === "sensitive" ? "high" : "neutral"}>{r.sensitivity}</Chip></td>
                  <td className="small dim">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Identity model" sub="Who, on which laptop, with which agent, through what, on what — taken from a real recorded action" />
        <div className="card">
          {!sample ? <div className="small dim">No actions recorded yet — run one in the Simulation Lab.</div> : <>
          <div className="small" style={{ marginBottom: 10 }}>
            <DecisionChip d={sample.decision} small /> {describe(sample)} <span className="faint mono">· {sample.id}</span>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {[
              `User: ${userById(sample.user)?.name ?? sample.user}`,
              `Device: ${deviceById(sample.device)?.name ?? sample.device}`,
              `Agent: ${names(sample).agent}`,
              `Through: ${sample.application ?? sample.plane.toLowerCase()}`,
              `On: ${names(sample).resource}`,
              ...(sample.destination ? [`To: ${names(sample).destination}`] : []),
            ].map((x, i, arr) => (
              <span key={x} className="row" style={{ gap: 8 }}>
                <Chip tone="neutral">{x}</Chip>
                {i < arr.length - 1 && <span className="faint">→</span>}
              </span>
            ))}
          </div>
          <div className="small dim" style={{ marginTop: 12, lineHeight: 1.5 }}>
            <Fingerprint size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            User (from Okta SSO, simulated) + device + agent + tool + resource flow into every decision and
            every evidence record. “Traffic came from Chrome” is never an identity.
          </div>
          </>}
        </div>
      </div>

      <div className="section">
        <SectionHead title="Action Ontology — normalization" sub="Different mechanisms normalize to one semantic verb, so policy is written once" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Raw mechanism</th><th>Via</th><th>Normalized verb</th></tr></thead>
            <tbody>
              {ACTION_NORMALIZATION.map((a) => (
                <tr key={a.raw}>
                  <td className="mono small">{a.raw}</td>
                  <td className="small dim">{a.via}</td>
                  <td><Chip tone="constrain">{a.verb}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="small faint row" style={{ gap: 6, marginTop: 12 }}>
          <Shuffle size={13} />
          Policy is written once against the verb. See it applied live in the{" "}
          <a onClick={() => nav("simlab")}>Simulation Lab</a>
          <ArrowRight size={12} />
        </div>
      </div>
    </div>
  );
}
