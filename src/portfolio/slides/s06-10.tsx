// Slides 6–10: personas, the solution, intent → policy, the decision live, the screens.
import type { SlideProps } from "../deck";
import { Display, Eyebrow, Lead, Reveal, Sources, Shot, claimById, fmtDate, Lightbox } from "../ui";
import { ArchFlow, DrafterDemo, LiveDecide } from "../live";
import { photoOf } from "../../ui/logos";

/* ---------- 6 · personas ---------- */
const PERSONAS = [
  { role: "Security leader", who: "CISO · Head of AI security", photo: "u-maya", job: "Prove to the board and auditors that agents cannot exfiltrate data or mutate production without a decision on record.", uses: ["Control Room", "Coverage Map", "Safety Kernel", "Evidence"] },
  { role: "AI-platform engineer", who: "owns the agent stack", photo: "u-daniel", job: "Roll Wrapbox out through MDM and gateways, keep coverage honest, and never be the reason a developer is blocked for no reason.", uses: ["Integrations", "Coverage Map", "Policy Simulator", "Settings"] },
  { role: "Developer using agents", who: "Claude Code · Codex · Cursor", photo: "u-priya", job: "Ship with agents at full speed — and see, in the terminal, exactly why an action was held or constrained.", uses: ["Simulation Lab", "Live Actions", "Tasks"] },
  { role: "Approver", who: "engineering manager · on-call", photo: "u-alex", job: "Decide a parked step in seconds with blast radius, safer alternative and expiry — never approve their own request.", uses: ["Review Center", "Standing Permissions", "Break Glass"] },
  { role: "Governance & compliance", who: "risk · privacy · audit", photo: "ananya.r", job: "Turn policy language into enforceable intent contracts and export a tamper-evident trail for EU AI Act, NIST and ISO 42001 evidence.", uses: ["Intent Studio", "Evidence", "Trust Graph"] },
];
const EVIDENCE = [
  { id: "personas-10", v: "82%", l: "of organizations have unknown AI agents running in their infrastructure — while 68% believe they have strong visibility" },
  { id: "personas-11", v: "53%", l: "have already had AI agents exceed their intended permissions" },
  { id: "personas-1", v: "46%", l: "of developers actively distrust the accuracy of AI tools, versus 33% who trust it" },
];
export function Personas() {
  const ev = EVIDENCE.map((e) => ({ ...e, c: claimById(e.id) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 28 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>03 · Concept — who it's for</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>Five people, <em>one decision.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 19 }}>Enterprise B2B buying is a committee. Every screen exists because one of these people has to trust the product with a job they are accountable for — and the same decision has to satisfy all five.</Lead></Reveal>
      </div>
      <div className="cols" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16, alignItems: "stretch" }}>
        {PERSONAS.map((p, k) => (
          <Reveal key={p.role} i={k + 2} className="card persona" style={{ padding: "20px 20px" }}>
            <img src={photoOf(p.photo) ?? photoOf("u-priya")} alt="" />
            <div className="role">{p.role}</div>
            <div className="small mono" style={{ fontSize: 11.5 }}>{p.who}</div>
            <div className="job">{p.job}</div>
            <div className="uses" style={{ marginTop: 8 }}>{p.uses.map((u) => <span key={u}>{u}</span>)}</div>
          </Reveal>
        ))}
      </div>
      <Reveal i={7} className="cols cols-3" style={{ gap: 18, marginTop: "auto" }}>
        {ev.map((e, k) => <div key={e.id} className="tile" style={{ display: "flex", gap: 16, alignItems: "center", padding: "14px 18px" }}><span style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.04em", whiteSpace: "nowrap", lineHeight: 1 }}>{e.v}</span><span className="small" style={{ fontSize: 13.5, lineHeight: 1.4 }}>{e.l}<sup className="sup">{k + 1}</sup>{e.c && <span className="mono" style={{ display: "block", fontSize: 11, marginTop: 3 }}>{e.c.source_org} · {fmtDate(e.c.published)}</span>}</span></div>)}
      </Reveal>
      <Sources ids={EVIDENCE.map((e) => e.id)} />
    </div>
  );
}

/* ---------- 7 · solution ---------- */
export function Solution({ active }: SlideProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>04 · Product — end to end</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>One decision engine. <em>Three planes.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>Every action an agent takes is held at the plane where it happens, described with its full identity chain, inspected, decided by one engine and recorded in a hash chain. What you see animating is the real engine deciding real scenarios.</Lead></Reveal>
      </div>
      <Reveal i={3} style={{ flex: 1, minHeight: 0 }}><ArchFlow active={active} /></Reveal>
      <div style={{ height: 40 }} />
    </div>
  );
}

/* ---------- 8 · intent ---------- */
export function Intent({ active }: SlideProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>04 · Product — Intent Studio</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>Plain English in. <em>Enforceable policy out.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>Security leaders think in sentences, engines think in clauses. The drafter extracts data classes, destinations and the required action into one normalized rule — and each clause declares the capability it needs, so coverage is claimed only where the runtime can deliver. Edit the text; the policy follows.</Lead></Reveal>
      </div>
      <Reveal i={3} style={{ flex: 1, minHeight: 0 }}><DrafterDemo active={active} /></Reveal>
    </div>
  );
}

/* ---------- 9 · decision live ---------- */
export function DecisionLive({ active }: SlideProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 18 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>04 · Product — Core Brain</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>The decision, <em>live.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>Pick a scenario. The trace on the left is what the developer sees in their terminal; the list on the right is the order the engine checks, and which layer decided. Nine checks, strictest wins, break-glass never overrides the Safety Kernel.</Lead></Reveal>
      </div>
      <Reveal i={3} style={{ flex: 1, minHeight: 0 }}><LiveDecide active={active} /></Reveal>
    </div>
  );
}

/* ---------- 10 · screens ---------- */
const GROUPS: { g: string; items: { name: string; label: string; why: string; url?: string }[] }[] = [
  { g: "Activity", items: [{ name: "control", label: "Control Room", why: "Every figure derived from live state — the security leader's first screen." }, { name: "live", label: "Live Actions", why: "Each decision with its identity chain and reasons." }] },
  { g: "Policy", items: [{ name: "intent", label: "Intent Studio", why: "Plain English → contracts; activation refused where coverage is missing." }, { name: "safety", label: "Safety Kernel", why: "Vendor-managed rules: observe 7 days, then enforce." }] },
  { g: "Authorization", items: [{ name: "reviews", label: "Review Center", why: "Parked steps with blast radius, safer path, expiry." }, { name: "breakglass", label: "Break Glass", why: "Scoped, time-boxed, loud — never above the Kernel." }] },
  { g: "Visibility", items: [{ name: "coverage", label: "Coverage Map", why: "What is enforced, degraded, understood, pending." }, { name: "evidence", label: "Evidence", why: "Hash-chained records for auditors." }] },
  { g: "Simulation", items: [{ name: "simlab", label: "Simulation Lab", why: "What the agent sees: the terminal trace." }, { name: "onboarding-admin", label: "Onboarding", url: "wrapbox.app/#onboarding", why: "Seven steps from zero to enforcing — real writes, simulated vendors." }] },
];
export function Screens() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 22 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>04 · Product — information architecture</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>Twenty screens. <em>One store.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>Five groups follow the buyer's questions in order: what is happening, what is the policy, who may approve, can we prove it, and can we try it safely. No screen keeps its own copy of events, rules or reviews. Click any screen to enlarge.</Lead></Reveal>
      </div>
      <div className="cols" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 18, flex: 1, alignItems: "start" }}>
        {GROUPS.map((g, k) => (
          <Reveal key={g.g} i={k + 2} className="stack" style={{ gap: 12 }}>
            <div className="small mono" style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--acc)" }}>{g.g}</div>
            {g.items.map((it) => (
              <div key={it.name} className="stack" style={{ gap: 6 }}>
                <Shot name={it.name} alt={it.label} url={it.url ?? `wrapbox.app/#${it.name}`} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>{it.label}</div>
                <div className="small" style={{ fontSize: 12.5, lineHeight: 1.4 }}>{it.why}</div>
              </div>
            ))}
          </Reveal>
        ))}
      </div>
      <Lightbox />
    </div>
  );
}
