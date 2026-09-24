// Integrations — simulated enterprise connections + identity model.
import { PageHead, Chip, StatusChip, SimNote, SectionHead, Stat } from "../ui/kit";
import { RESOURCES } from "../model/org";
import { ACTION_NORMALIZATION } from "../model/registries";
import { logoUrl } from "../ui/logos";
import { Plug, ShieldCheck, AlertTriangle, Radar, Fingerprint, Shuffle, ArrowRight } from "lucide-react";

const CONNECTIONS = [
  { name: "GitHub Organization", logo: "github_light", kind: "Gateway connector", status: "ENFORCED", detail: "github.com/veridian · push/PR/branch operations governed" },
  { name: "PostgreSQL gateway", logo: "postgresql", kind: "Gateway connector", status: "ENFORCED", detail: "payments-prod, customer-db · query preflight + row estimates" },
  { name: "AWS Production", logo: "aws", kind: "Gateway connector", status: "DEGRADED", detail: "IAM + S3 governed; remaining services observed" },
  { name: "macOS Endpoint runtime", logo: "wrapbox-icon", kind: "Endpoint plane", status: "ENFORCED", detail: "4 enrolled devices · file/process authorization" },
  { name: "Network Extension", logo: "wrapbox-icon", kind: "Network plane", status: "ENFORCED", detail: "HTTPS + WebSocket inspection · QUIC downgraded" },
  { name: "Salesforce Service Cloud", logo: "salesforce", kind: "SaaS destination", status: "ENFORCED", detail: "Approved SaaS destination class" },
  { name: "MCP registry", logo: "mcp", kind: "Gateway connector", status: "UNDERSTOOD_ONLY", detail: "1 unknown MCP server discovered, unregistered" },
  { name: "Okta SSO", logo: "okta", kind: "Identity provider", status: "ENFORCED", detail: "User identity for decisions & evidence" },
];

export function IntegrationsPage({ nav }: { nav: (r: string) => void }) {
  const enforced = CONNECTIONS.filter((c) => c.status === "ENFORCED").length;
  const degraded = CONNECTIONS.filter((c) => c.status === "DEGRADED").length;
  const understood = CONNECTIONS.filter((c) => c.status === "UNDERSTOOD_ONLY").length;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="System"
        title="Integrations"
        sub="Enforcement planes and enterprise connections. Every integration here is simulated with representative states — connector behavior mirrors the production design."
        right={<SimNote>All connections simulated</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Plug size={17} />} label="Connections" value={CONNECTIONS.length} note="planes + enterprise systems" />
        <Stat icon={<ShieldCheck size={17} />} label="Enforced" value={enforced} tone="good" note="governing traffic inline" />
        <Stat icon={<AlertTriangle size={17} />} label="Degraded" value={degraded} tone={degraded > 0 ? "warn" : "good"} note="partial coverage, observing rest" />
        <Stat icon={<Radar size={17} />} label="Understood only" value={understood} tone={understood > 0 ? "info" : "good"} note="discovered, not yet registered" />
      </div>

      <div className="section">
        <SectionHead title="Connected systems" sub="Each connection reports its live enforcement state" />
        <div className="grid g2">
          {CONNECTIONS.map((c) => (
            <div className="card" key={c.name}>
              <div className="spread">
                <span className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                  <img src={logoUrl(c.logo)} alt="" className="logo-lg" />
                  <b>{c.name}</b>
                </span>
                <StatusChip s={c.status} />
              </div>
              <div className="small faint" style={{ marginTop: 10 }}>{c.kind}</div>
              <div className="small dim" style={{ marginTop: 4 }}>{c.detail}</div>
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
        <SectionHead title="Identity model" sub="The full chain that flows into every decision and evidence record" />
        <div className="card">
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {["User: Priya Menon", "Device: MacBook-Pro-14", "Agent: Claude Code", "Process: claude", "Tool: GitHub MCP", "Resource: checkout-service"].map((x, i, arr) => (
              <span key={x} className="row" style={{ gap: 8 }}>
                <Chip tone="neutral">{x}</Chip>
                {i < arr.length - 1 && <span className="faint">→</span>}
              </span>
            ))}
          </div>
          <div className="small dim" style={{ marginTop: 12, lineHeight: 1.5 }}>
            <Fingerprint size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />
            The full identity chain — user + device + agent + process + tool + resource — flows into every decision and
            every evidence record. “Traffic came from Chrome” is never an identity.
          </div>
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
