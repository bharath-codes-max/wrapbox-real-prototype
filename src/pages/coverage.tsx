// Coverage Map — data/action × destination × plane × capability state.
// Deliberately not all-green: gaps are the product being honest.
import { PageHead, StatusChip, SimNote, Chip } from "../ui/kit";
import { CAPABILITIES, DATA_TYPES } from "../model/registries";
import type { CoverageStatus } from "../model/types";

const MATRIX: { flow: string; destination: string; plane: string; status: CoverageStatus; note: string }[] = [
  { flow: "PII.EMAIL / PII.PHONE", destination: "External AI", plane: "NETWORK", status: "ENFORCED", note: "Tokenized in-line before transmission" },
  { flow: "CREDENTIAL.*", destination: "Any external", plane: "NETWORK", status: "ENFORCED", note: "Blocked pre-transmission; Safety Kernel backstop" },
  { flow: "SOURCE_CODE", destination: "Unapproved external", plane: "NETWORK", status: "ENFORCED", note: "Review-gated" },
  { flow: "PCI.CARD", destination: "Any external", plane: "NETWORK", status: "ENFORCED", note: "Hard block per contract" },
  { flow: "HEALTH.PHI (scanned docs)", destination: "External AI", plane: "NETWORK", status: "PENDING", note: "PHI contract is DRAFT — not yet active" },
  { flow: "HR.COMPENSATION / LEGAL.PRIVILEGED", destination: "External AI", plane: "NETWORK", status: "DEGRADED", note: "Semantic classifier v0.7 — reduced confidence" },
  { flow: "Encrypted archives", destination: "Any", plane: "NETWORK", status: "UNINSPECTABLE", note: "Cannot parse; fail-closed where protected clauses apply" },
  { flow: "Local file read/write (agents)", destination: "—", plane: "ENDPOINT", status: "ENFORCED", note: "Simulated ES entitlement active for demo" },
  { flow: "Secret file access (.env, keys)", destination: "—", plane: "ENDPOINT", status: "ENFORCED", note: "SECRET_ACCESS classified and gated" },
  { flow: "Process execution", destination: "—", plane: "ENDPOINT", status: "ENFORCED", note: "exec authorization" },
  { flow: "Clipboard exfiltration", destination: "—", plane: "ENDPOINT", status: "PENDING", note: "Capability planned; no coverage claim today" },
  { flow: "GitHub push / branch ops", destination: "GitHub org", plane: "GATEWAY", status: "ENFORCED", note: "Force-push & protected-branch rules" },
  { flow: "SQL read / export", destination: "customer-db, payments-prod", plane: "GATEWAY", status: "ENFORCED", note: "Row estimates + blast-radius budgets" },
  { flow: "Cloud IAM / S3", destination: "AWS Production", plane: "GATEWAY", status: "DEGRADED", note: "IAM+S3 governed; other AWS services understood only" },
  { flow: "MCP tool calls", destination: "Registered MCP servers", plane: "GATEWAY", status: "UNDERSTOOD_ONLY", note: "Observed and classified; enforcement rolling out" },
  { flow: "Unknown MCP servers", destination: "Unregistered", plane: "GATEWAY", status: "DEGRADED", note: "Visible via discovery; network backstop applies" },
];

export function CoverageMap({ nav }: { nav: (r: string) => void }) {
  const counts = MATRIX.reduce<Record<string, number>>((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; }, {});
  return (
    <div className="page">
      <PageHead
        title="Coverage Map"
        sub="Where enforcement is strong, where it is degraded, and where it does not yet exist. Wrapbox never claims protection it cannot deliver — gaps are explicit."
        right={<SimNote>Capability states are demo data; the honesty model is the product</SimNote>}
      />
      <div className="row" style={{ marginBottom: 14 }}>
        {(["ENFORCED", "DEGRADED", "UNDERSTOOD_ONLY", "PENDING", "UNINSPECTABLE"] as CoverageStatus[]).map((st) => (
          <div key={st} className="row" style={{ gap: 6 }}>
            <StatusChip s={st} /><b className="mono">{counts[st] ?? 0}</b>
          </div>
        ))}
      </div>

      <div className="card matrix">
        <table style={{ width: "100%" }}>
          <thead>
            <tr><th>Data / action flow</th><th>Destination / resource</th><th>Plane</th><th>Status</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {MATRIX.map((r, i) => (
              <tr key={i}>
                <td><b className="small">{r.flow}</b></td>
                <td className="small dim">{r.destination}</td>
                <td><Chip tone="neutral">{r.plane}</Chip></td>
                <td><StatusChip s={r.status} /></td>
                <td className="small dim">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Capability registry</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Capability</th><th>Plane</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>
            {CAPABILITIES.map((c) => (
              <tr key={c.id}>
                <td><b className="small">{c.label}</b> <span className="mono faint small">{c.id}</span></td>
                <td><Chip tone="neutral">{c.plane}</Chip></td>
                <td><StatusChip s={c.status} /></td>
                <td className="small dim">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Data type registry</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Class</th><th>Family</th><th>Example</th><th>Severity</th></tr></thead>
          <tbody>
            {DATA_TYPES.map((d) => (
              <tr key={d.id}>
                <td><Chip tone="violet">{d.id}</Chip></td>
                <td className="small">{d.family}</td>
                <td className="mono small dim">{d.example}</td>
                <td><Chip tone={d.severity}>{d.severity}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small faint" style={{ marginTop: 8 }}>
        Contract activation is gated on these states — see <a onClick={() => nav("intent")}>Intent Studio</a>.
      </div>
    </div>
  );
}
