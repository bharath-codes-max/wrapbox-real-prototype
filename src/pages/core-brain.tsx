// Core Brain — the one decision engine. The check order below is the real order
// in engine/brain.ts decide(), and each count is how many recorded actions that
// step decided (event.decidedBy), so the page can't drift from the engine.
import { useAppState } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, StatusChip, SimNote, DecisionChip } from "../ui/kit";
import { describe } from "../ui/describe";
import type { DecidedBy } from "../model/types";
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

const ORDER: { layer: DecidedBy["layer"]; name: string; asks: string; page?: [string, string] }[] = [
  { layer: "uninspectable", name: "Can we see inside?", asks: "If the content can't be read (e.g. an encrypted zip) and a rule protects that kind of data, stop — fail closed." },
  { layer: "contract", name: "Your rules", asks: "Which of your Intent Contract rules match this action? The strictest one wins.", page: ["intent", "Intent Studio"] },
  { layer: "safety", name: "Safety Kernel", asks: "Does a built-in, always-on rule say no? Your rules can't switch these off.", page: ["safety", "Safety Kernel"] },
  { layer: "blast", name: "Blast radius", asks: "How much could this break — rows, files, services? Too big means it waits for a yes.", page: ["simlab", "Simulation Lab"] },
  { layer: "context", name: "Context", asks: "Is this production, or privileged? Risky verbs there need a yes even without a rule.", page: ["simlab", "Simulation Lab"] },
  { layer: "envelope", name: "Task permission slip", asks: "Inside a task: is this within the slip's systems, actions, time and file budget?", page: ["tasks", "Tasks"] },
  { layer: "standing", name: "Standing permission", asks: "Outside a task: does this agent have everyday permission here, within its limits?", page: ["standing", "Standing Permissions"] },
  { layer: "breakglass", name: "Break Glass", asks: "Is an emergency override on for exactly this system? It can lift a hold — never a Safety Kernel no.", page: ["breakglass", "Break Glass"] },
  { layer: "default", name: "Nothing objected", asks: "No rule restricts this action, so it's allowed and recorded." },
];

export function CoreBrainPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const decided = (l: string) => s.events.filter((e) => e.decidedBy?.layer === l).length;
  const byTime = [...s.events].sort((a, b) => b.timestamp - a.timestamp);
  const root = byTime.find((e) => /checkout/i.test(e.resource)) ?? byTime[0];
  const detectorsEnforced = DETECTORS.filter((d) => d.status === "ENFORCED").length;
  const transformsReversible = TRANSFORMS.filter((t) => t.reversible).length;
  const capsEnforced = CAPABILITIES.filter((c) => c.status === "ENFORCED").length;
  const planeCount = new Set(CAPABILITIES.filter((c) => c.plane !== "BRAIN").map((c) => c.plane)).size;

  return (
    <div className="page">
      <PageHead
        eyebrow="System"
        title="Core Brain"
        sub="The one engine that makes every decision you've seen — from the laptop, the network and the gateways alike. Same checks, same order, every time, with the reasons written down."
        right={<SimNote>Architecture view — components simulated, decision flow real</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<Cpu size={17} />} label="Decisions made" value={s.events.length} tone="info" note={`from ${planeCount} planes, one brain`} onClick={() => nav("evidence")} />
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
        <SectionHead title="The order the brain checks" sub="Every action goes through these steps in this order. The number is how many of your recorded actions that step decided." />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>#</th><th>Step</th><th>What it asks</th><th>Decided</th><th></th></tr></thead>
            <tbody>
              {ORDER.map((o, i) => (
                <tr key={o.layer}>
                  <td className="small faint">{i + 1}</td>
                  <td><b className="small">{o.name}</b></td>
                  <td className="small dim">{o.asks}</td>
                  <td className="small"><b>{decided(o.layer)}</b></td>
                  <td>{o.page && <a className="small row" style={{ gap: 4 }} onClick={() => nav(o.page![0])}>{o.page[1]} <ArrowRight size={12} /></a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {root && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="small faint">Latest action on your checkout code</div>
            <div className="row small" style={{ gap: 8, marginTop: 6 }}>
              <DecisionChip d={root.decision} small /> <b>{describe(root)}</b> <span className="faint mono">· {root.id}</span>
            </div>
            <div className="small dim" style={{ marginTop: 6 }}>Decided by: {root.decidedBy?.label ?? "—"}</div>
          </div>
        )}
      </div>

      <div className="section">
        <SectionHead title="Architecture" sub="Four stages from natural-language policy to a deterministic, explainable decision" />
        <div className="grid g2">
          <Block title="1 · Policy Compiler" items={["Intent Parser (NL → policy)", "Policy IR", "Policy Validator", "Versioned Policy Store"]} />
          <Block title="2 · Registries (pluggable)" items={["Data Type Registry", "Detector Registry", "Parser/Extractor Registry", "Destination Registry", "Transform Registry", "Capability Registry", "Action Ontology", "Safety Kernel Rules"]} />
          <Block title="3 · Analysis & Classification" items={["Content Analysis", "Detectors (PII/secrets/EDM)", "Parsers & OCR", "Semantic Classification", "Source-Code Analysis", "Action Understanding", "Context Enrichment"]} />
          <Block title="4 · Decision Engine" items={["Policy Evaluation", "Safety Kernel", "Risk & Context", "Blast-Radius Governor", "Transform Planning", "Standing Permissions", "Task Envelopes", "Break-Glass", "Park / Resume"]} tone="accent" />
        </div>
      </div>

      <div className="section">
        <SectionHead title="Decision inputs" sub="Every consequential action is judged against this full set of signals" />
        <div className="card">
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
            {["WHO", "DEVICE", "AGENT", "ACTION", "RESOURCE", "DATA", "DESTINATION", "CONTEXT", "INTENT CONTRACT", "SAFETY KERNEL", "TASK / STANDING AUTHORITY"].map((x, i, arr) => (
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
