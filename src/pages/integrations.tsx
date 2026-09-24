// Integrations — simulated enterprise connections + identity model.
import { PageHead, Chip, StatusChip, SimNote } from "../ui/kit";
import { RESOURCES } from "../model/org";
import { ACTION_NORMALIZATION } from "../model/registries";

const CONNECTIONS = [
  { name: "GitHub Organization", kind: "Gateway connector", status: "ENFORCED", detail: "github.com/veridian · push/PR/branch operations governed" },
  { name: "PostgreSQL gateway", kind: "Gateway connector", status: "ENFORCED", detail: "payments-prod, customer-db · query preflight + row estimates" },
  { name: "AWS Production", kind: "Gateway connector", status: "DEGRADED", detail: "IAM + S3 governed; remaining services observed" },
  { name: "macOS Endpoint runtime", kind: "Endpoint plane", status: "ENFORCED", detail: "4 enrolled devices · file/process authorization" },
  { name: "Network Extension", kind: "Network plane", status: "ENFORCED", detail: "HTTPS + WebSocket inspection · QUIC downgraded" },
  { name: "Salesforce Service Cloud", kind: "SaaS destination", status: "ENFORCED", detail: "Approved SaaS destination class" },
  { name: "MCP registry", kind: "Gateway connector", status: "UNDERSTOOD_ONLY", detail: "1 unknown MCP server discovered, unregistered" },
  { name: "Okta SSO", kind: "Identity provider", status: "ENFORCED", detail: "User identity for decisions & evidence" },
];

export function IntegrationsPage({ nav }: { nav: (r: string) => void }) {
  return (
    <div className="page">
      <PageHead
        title="Integrations"
        sub="Enforcement planes and enterprise connections. Every integration here is simulated with representative states — connector behavior mirrors the production design."
        right={<SimNote>All connections simulated</SimNote>}
      />
      <div className="grid g2">
        {CONNECTIONS.map((c) => (
          <div className="card" key={c.name}>
            <div className="spread">
              <b>{c.name}</b>
              <StatusChip s={c.status} />
            </div>
            <div className="small faint">{c.kind}</div>
            <div className="small dim" style={{ marginTop: 4 }}>{c.detail}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Governed resources</h2>
      <div className="card" style={{ padding: 0 }}>
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

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Identity model</h2>
      <div className="card">
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {["User: Priya Menon", "Device: MacBook-Pro-14", "Agent: Claude Code", "Process: claude", "Tool: GitHub MCP", "Resource: checkout-service"].map((x, i, arr) => (
            <span key={x} className="row" style={{ gap: 6 }}>
              <Chip tone="neutral">{x}</Chip>
              {i < arr.length - 1 && <span className="faint">→</span>}
            </span>
          ))}
        </div>
        <div className="small dim" style={{ marginTop: 8 }}>
          The full identity chain — user + device + agent + process + tool + resource — flows into every decision and
          every evidence record. “Traffic came from Chrome” is never an identity.
        </div>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Action Ontology — normalization</h2>
      <div className="card" style={{ padding: 0 }}>
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
      <div className="small faint" style={{ marginTop: 6 }}>
        Different technical mechanisms normalize to one semantic action — policy is written once against the verb.
        See it applied live in the <a onClick={() => nav("simlab")}>Simulation Lab</a>.
      </div>
    </div>
  );
}
