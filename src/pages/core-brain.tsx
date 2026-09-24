// Core Brain — system visualization for technical demos.
import { PageHead, SectionHead, Stat, Chip, StatusChip, SimNote } from "../ui/kit";
import { DETECTORS, CAPABILITIES, TRANSFORMS } from "../model/registries";
import { ScanSearch, Shuffle, ShieldCheck, Cpu, Boxes, ArrowRight } from "lucide-react";

function Block({ title, items, tone }: { title: string; items: string[]; tone?: string }) {
  return (
    <div className="card">
      <b className="small" style={tone ? { color: `var(--${tone})` } : undefined}>{title}</b>
      <div className="row" style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
        {items.map((i) => <Chip key={i} tone="neutral">{i}</Chip>)}
      </div>
    </div>
  );
}

export function CoreBrainPage({ nav }: { nav: (r: string) => void }) {
  const detectorsEnforced = DETECTORS.filter((d) => d.status === "ENFORCED").length;
  const transformsReversible = TRANSFORMS.filter((t) => t.reversible).length;
  const capsEnforced = CAPABILITIES.filter((c) => c.status === "ENFORCED").length;
  const planeCount = new Set(CAPABILITIES.map((c) => c.plane)).size;

  return (
    <div className="page">
      <PageHead
        eyebrow="System"
        title="Core Brain"
        sub="One decision brain serving all three enforcement planes. Policy compiles to an intermediate representation; pluggable registries describe data, detectors, destinations, transforms and capabilities; analysis feeds a deterministic decision engine."
        right={<SimNote>Architecture view — components simulated, decision flow real</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Cpu size={17} />} label="Enforcement planes" value={planeCount} tone="info" note="one brain, three arms" />
        <Stat icon={<ScanSearch size={17} />} label="Detectors" value={DETECTORS.length} tone="good" note={`${detectorsEnforced} enforced`} />
        <Stat icon={<Shuffle size={17} />} label="Transforms" value={TRANSFORMS.length} note={`${transformsReversible} reversible`} />
        <Stat icon={<ShieldCheck size={17} />} label="Capabilities" value={CAPABILITIES.length} tone="good" note={`${capsEnforced} enforced`} onClick={() => nav("coverage")} />
      </div>

      <div className="section">
        <SectionHead title="One brain, three arms" sub="Every plane routes to a single deterministic decision engine that returns one of four outcomes" />
        <div className="card" style={{ textAlign: "center", background: "var(--bg-inset)" }}>
          <div className="row" style={{ justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <Chip tone="constrain">ENDPOINT · local actions</Chip>
            <Chip tone="constrain">NETWORK · traffic & data</Chip>
            <Chip tone="constrain">GATEWAY · resources & systems</Chip>
          </div>
          <div className="faint" style={{ margin: "10px 0" }}>▼ ▼ ▼</div>
          <b>WRAPBOX CORE BRAIN — one decision engine, three enforcement arms</b>
          <div className="faint" style={{ margin: "10px 0" }}>▼</div>
          <div className="row" style={{ justifyContent: "center" }}>
            <Chip tone="allow">ALLOW</Chip><Chip tone="constrain">CONSTRAIN</Chip>
            <Chip tone="review">REVIEW</Chip><Chip tone="block">BLOCK</Chip>
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Architecture" sub="Four stages from natural-language policy to a deterministic, explainable decision" />
        <div className="grid g2">
          <Block title="1 · Policy Compiler" items={["Intent Parser (NL → policy)", "Policy IR", "Policy Validator", "Versioned Policy Store"]} />
          <Block title="2 · Registries (pluggable)" items={["Data Type Registry", "Detector Registry", "Parser/Extractor Registry", "Destination Registry", "Transform Registry", "Capability Registry", "Action Ontology", "Safety Kernel Rules"]} />
          <Block title="3 · Analysis & Classification" items={["Content Analysis", "Detectors (PII/secrets/EDM)", "Parsers & OCR", "Semantic Classification", "Source-Code Analysis", "Action Understanding", "Context Enrichment"]} />
          <Block title="4 · Decision Engine" items={["Policy Evaluation", "Safety Kernel", "Risk & Context", "Blast-Radius Governor", "Transform Planning", "Standing Permissions", "Transaction Bundles", "Park / Resume"]} tone="accent" />
        </div>
      </div>

      <div className="section">
        <SectionHead title="Decision inputs" sub="Every consequential action is judged against this full set of signals" />
        <div className="card">
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {["WHO", "AGENT", "ACTION", "RESOURCE", "DATA", "DESTINATION", "CONTEXT", "INTENT CONTRACT", "SAFETY KERNEL", "CAPABILITY STATE"].map((x, i, arr) => (
              <span key={x} className="row" style={{ gap: 6 }}>
                <Chip tone="violet">{x}</Chip>{i < arr.length - 1 ? <span className="faint">+</span> : <span className="faint">→ DECISION</span>}
              </span>
            ))}
          </div>
          <div className="small dim" style={{ marginTop: 12 }}>
            Decisions are deterministic and explainable. Semantic/ML signals are inputs; the final decision always carries
            explicit reasons — no opaque risk scores.
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Detector Registry" sub="Pluggable analyzers that classify content into typed data findings" right={<span className="row" style={{ gap: 6 }}><Boxes size={13} /><span className="small dim">{DETECTORS.length} registered</span></span>} />
        <div className="card card-pad-0">
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
      </div>

      <div className="section">
        <SectionHead title="Transform Registry" sub="How sensitive data is neutralized when an action is constrained rather than blocked" right={<span className="row" style={{ gap: 6 }}><Shuffle size={13} /><span className="small dim">{TRANSFORMS.length} kinds</span></span>} />
        <div className="card card-pad-0">
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
      </div>

      <div className="section">
        <SectionHead
          title="Capability truthfulness"
          sub="Capabilities that are not fully enforced gate contract activation honestly — nothing claims coverage it lacks"
          right={<button className="btn btn-sm" onClick={() => nav("coverage")}>Coverage Map <ArrowRight size={13} /></button>}
        />
        <div className="card card-pad-0">
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
      </div>
    </div>
  );
}
