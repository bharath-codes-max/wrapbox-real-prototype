// Core Brain — system visualization for technical demos.
import { PageHead, Chip, StatusChip, SimNote } from "../ui/kit";
import { DETECTORS, CAPABILITIES, TRANSFORMS } from "../model/registries";

function Block({ title, items, tone }: { title: string; items: string[]; tone?: string }) {
  return (
    <div className="card" style={{ padding: "10px 12px" }}>
      <b className="small" style={tone ? { color: `var(--${tone})` } : undefined}>{title}</b>
      <div className="row" style={{ marginTop: 6, gap: 5 }}>
        {items.map((i) => <Chip key={i} tone="neutral">{i}</Chip>)}
      </div>
    </div>
  );
}

export function CoreBrainPage({ nav }: { nav: (r: string) => void }) {
  return (
    <div className="page">
      <PageHead
        title="Core Brain"
        sub="One decision brain serving all three enforcement planes. Policy compiles to an intermediate representation; pluggable registries describe data, detectors, destinations, transforms and capabilities; analysis feeds a deterministic decision engine."
        right={<SimNote>Architecture view — components simulated, decision flow real</SimNote>}
      />

      <div className="card" style={{ textAlign: "center", background: "var(--bg-inset)", marginBottom: 14 }}>
        <div className="row" style={{ justifyContent: "center", gap: 18 }}>
          <Chip tone="constrain">ENDPOINT · local actions</Chip>
          <Chip tone="constrain">NETWORK · traffic & data</Chip>
          <Chip tone="constrain">GATEWAY · resources & systems</Chip>
        </div>
        <div className="faint" style={{ margin: "6px 0" }}>▼ ▼ ▼</div>
        <b>WRAPBOX CORE BRAIN — one decision engine, three enforcement arms</b>
        <div className="faint" style={{ margin: "6px 0" }}>▼</div>
        <div className="row" style={{ justifyContent: "center" }}>
          <Chip tone="allow">ALLOW</Chip><Chip tone="constrain">CONSTRAIN</Chip>
          <Chip tone="review">REVIEW</Chip><Chip tone="block">BLOCK</Chip>
        </div>
      </div>

      <div className="grid g2">
        <Block title="1 · Policy Compiler" items={["Intent Parser (NL → policy)", "Policy IR", "Policy Validator", "Versioned Policy Store"]} />
        <Block title="2 · Registries (pluggable)" items={["Data Type Registry", "Detector Registry", "Parser/Extractor Registry", "Destination Registry", "Transform Registry", "Capability Registry", "Action Ontology", "Safety Kernel Rules"]} />
        <Block title="3 · Analysis & Classification" items={["Content Analysis", "Detectors (PII/secrets/EDM)", "Parsers & OCR", "Semantic Classification", "Source-Code Analysis", "Action Understanding", "Context Enrichment"]} />
        <Block title="4 · Decision Engine" items={["Policy Evaluation", "Safety Kernel", "Risk & Context", "Blast-Radius Governor", "Transform Planning", "Standing Permissions", "Transaction Bundles", "Park / Resume"]} tone="accent" />
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Decision inputs</h2>
      <div className="card">
        <div className="row" style={{ gap: 6 }}>
          {["WHO", "AGENT", "ACTION", "RESOURCE", "DATA", "DESTINATION", "CONTEXT", "INTENT CONTRACT", "SAFETY KERNEL", "CAPABILITY STATE"].map((x, i, arr) => (
            <span key={x} className="row" style={{ gap: 6 }}>
              <Chip tone="violet">{x}</Chip>{i < arr.length - 1 ? <span className="faint">+</span> : <span className="faint">→ DECISION</span>}
            </span>
          ))}
        </div>
        <div className="small dim" style={{ marginTop: 8 }}>
          Decisions are deterministic and explainable. Semantic/ML signals are inputs; the final decision always carries
          explicit reasons — no opaque risk scores.
        </div>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Detector Registry</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Detector</th><th>Method</th><th>Detects</th><th>Status</th></tr></thead>
          <tbody>
            {DETECTORS.map((d) => (
              <tr key={d.id}>
                <td className="mono small">{d.id} <span className="faint">v{d.version}</span></td>
                <td className="small dim">{d.method}</td>
                <td>{d.detects.map((x) => <Chip key={x} tone="violet">{x}</Chip>)}</td>
                <td><StatusChip s={d.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Transform Registry</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Transform</th><th>Reversible</th><th>Example</th></tr></thead>
          <tbody>
            {TRANSFORMS.map((t) => (
              <tr key={t.kind}>
                <td><Chip tone="constrain">{t.kind}</Chip></td>
                <td>{t.reversible ? <Chip tone="allow">yes · Token Vault</Chip> : <Chip tone="neutral">no</Chip>}</td>
                <td className="mono small dim">{t.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Capability truthfulness</h2>
      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Capability</th><th>Plane</th><th>Status</th></tr></thead>
          <tbody>
            {CAPABILITIES.filter((c) => c.status !== "ENFORCED").map((c) => (
              <tr key={c.id}>
                <td className="small">{c.label}</td>
                <td><Chip tone="neutral">{c.plane}</Chip></td>
                <td><StatusChip s={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="small faint" style={{ marginTop: 6 }}>
        Non-enforced capabilities gate contract activation truthfully — see <a onClick={() => nav("coverage")}>Coverage Map</a>.
      </div>
    </div>
  );
}
