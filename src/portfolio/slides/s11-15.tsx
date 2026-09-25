// Slides 11–15: honest by design, differentiation, business model, how it's built, next.
import { motion } from "framer-motion";
import type { SlideProps } from "../deck";
import { Display, Eyebrow, Lead, Reveal, Sources, Shot, TypeCode, claimById, fmtDate, Lightbox, Pill, Stat, CountUp } from "../ui";
import { research } from "../data/research";
import { CAPABILITIES, DETECTORS, DATA_TYPES, TRANSFORMS, DESTINATIONS, ACTION_NORMALIZATION } from "../../model/registries";
import { KERNEL_RULES, KERNEL_RELEASES, OBSERVE_WINDOW_DAYS } from "../../engine/kernel";
import { SCENARIOS } from "../../engine/scenarios";
import { SEED_CONTRACTS } from "../../model/contracts";

/* ---------- 11 · honest by design ---------- */
const count = (s: string) => CAPABILITIES.filter((c) => c.status === s).length;
export function Honest() {
  const enforced = count("ENFORCED"), degraded = count("DEGRADED"), understood = count("UNDERSTOOD_ONLY"), pending = count("PENDING"), unins = count("UNINSPECTABLE");
  const cards = [
    { name: "coverage", label: "Coverage Map", h: "Claims only what the runtime can keep", p: `${CAPABILITIES.length} registered capabilities: ${enforced} enforced, ${degraded} degraded, ${understood} understood only, ${pending} pending, ${unins} uninspectable. A contract cannot be activated if a clause needs a capability that is not live.` },
    { name: "safety", label: "Safety Kernel", h: "Rules the company cannot switch off", p: `${KERNEL_RULES.length} vendor-managed rules across ${KERNEL_RELEASES.length} releases — credential exfiltration, destructive production mutation, dangerous permission change, mass export, unknown transfers. New rules observe for ${OBSERVE_WINDOW_DAYS} days before they enforce.` },
    { name: "reviews", label: "Review Center", h: "Humans only where judgement is needed", p: "A REVIEW parks the step with blast radius, safer alternative and expiry. Approvers are routed by team; a requester can never approve their own action; approvals can be scoped narrower than asked." },
    { name: "evidence", label: "Evidence", h: "Every decision is chained", p: "hash = simpleHash(prevHash + id + decision + timestamp). The Control Room, Live Actions, the permit ticket and the evidence record all read the same event — so no screen can disagree with another." },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 22 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>04 · Product — the enterprise bar</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>Honest <em>by design.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>A security product that overstates its coverage is worse than none. Every number here is computed from the registries the engine actually runs on — the same numbers a customer would see on the Coverage Map.</Lead></Reveal>
      </div>
      <div className="cols cols-2" style={{ gap: "22px 28px", flex: 1, alignItems: "stretch" }}>
        {cards.map((c, k) => (
          <Reveal key={c.name} i={k + 2} className="card" style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "center", padding: "16px 18px" }}>
            <Shot name={c.name} alt={c.label} />
            <div>
              <div className="small mono" style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--acc)", marginBottom: 6 }}>{c.label}</div>
              <div className="h3" style={{ fontSize: 21, lineHeight: 1.15 }}>{c.h}</div>
              <p className="small" style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ink-2)", marginTop: 8 }}>{c.p}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Lightbox />
    </div>
  );
}

/* ---------- 12 · different ---------- */
// Rows shown (of the 17 researched), each backed by the vendor's own launch material or docs.
const MATRIX_ROWS: { name: string; show: string; src: string }[] = [
  { name: "Wrapbox (this prototype)", show: "Wrapbox", src: "" },
  { name: "Netskope One AI Security", show: "Netskope One AI Security", src: "competitors-1" },
  { name: "Zscaler AI Broker / Endpoint AI Security", show: "Zscaler AI Broker", src: "competitors-2" },
  { name: "Zenity", show: "Zenity", src: "competitors-7" },
  { name: "Prompt Security (SentinelOne)", show: "Prompt Security (SentinelOne)", src: "competitors-9" },
  { name: "Kong AI Gateway", show: "Kong AI Gateway", src: "competitors-6" },
  { name: "Okta Agent SSO", show: "Okta Agent SSO", src: "competitors-12" },
  { name: "Claude Code permissions", show: "Claude Code permissions", src: "competitors-15" },
];
export function Different() {
  const m = research.competitorMatrix;
  const rows = MATRIX_ROWS.map((r) => ({ ...r, row: m.rows.find((x) => x.name === r.name) })).filter((r) => r.row);
  const srcIds = [...MATRIX_ROWS.filter((r) => r.src).map((r) => r.src), "regulation-14"];
  const bypass = claimById("regulation-14");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>05 · Market — differentiation</Eyebrow></Reveal>
          <Reveal i={1}><Display sm style={{ fontSize: 44 }}>Adjacent tools guard the model or the network. <em>Wrapbox guards the action.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 15.5 }}>From each vendor's own launch material and docs: SSE platforms broker traffic, AI gateways govern model API calls, agent-security startups decide on agent platforms, identity vendors answer who the agent is. None compiles plain-English intent into one policy enforced at laptop, network and gateway — with scoped human review and a hash-chained record.</Lead></Reveal>
      </div>
      <Reveal i={3} className="matrix" style={{ gridTemplateColumns: `230px repeat(${m.axes.length}, minmax(0, 1fr))`, alignContent: "start" }}>
        <div className="mh" />
        {m.axes.map((a) => <div key={a} className="mh">{a}</div>)}
        {rows.map((r, k) => (
          <div key={r.name} className={`mr ${k === 0 ? "hero" : ""}`}>
            <div className="mn" title={r.row!.note}>{r.show}<small>{r.row!.category}{r.src ? ` · [${srcIds.indexOf(r.src) + 1}]` : ""}</small></div>
            {r.row!.cells.map((c, i) => <div key={i} className={`mc ${c}`} title={`${r.show}: ${m.axes[i]} — ${c}`}><i /></div>)}
          </div>
        ))}
      </Reveal>
      <div className="row" style={{ gap: 18, alignItems: "flex-start" }}>
        <span className="row small" style={{ gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 6, background: "var(--allow)", display: "inline-block" }} /> yes</span>
        <span className="row small" style={{ gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 6, border: "2px solid var(--review)", background: "linear-gradient(90deg, var(--review) 50%, transparent 50%)", display: "inline-block", boxSizing: "border-box" }} /> partial</span>
        <span className="row small" style={{ gap: 6 }}><span style={{ width: 12, height: 12, borderRadius: 6, border: "2px solid var(--line-strong)", display: "inline-block", boxSizing: "border-box" }} /> no</span>
        <span className="small" style={{ fontSize: 13 }}>Per each vendor's own documentation; the Wrapbox row is the prototype (integrations simulated).</span>
        {bypass && <span className="honest" style={{ marginLeft: "auto", fontSize: 12.5, padding: "6px 12px", maxWidth: 560 }}><b>Even the agent vendors say so —</b> Claude Code's docs: bypassPermissions “offers no protection against prompt injection or unintended actions.”<sup className="sup">{srcIds.length}</sup></span>}
      </div>
      <Sources ids={srcIds} />
    </div>
  );
}

/* ---------- 13 · business ---------- */
const GTM = [
  { l: "Land", h: "One team, one important workflow", p: "A developer, platform or AI team already using agents for real work. Runtime through their own MDM, one gateway in front of one system.", g: "A first deployment that is focused, useful and easy to evaluate." },
  { l: "Prove", h: "Show it works in the real environment", p: "Coverage Map, Review Center and Evidence in front of the security leader — with their traffic, not a demo.", g: "From an interesting demo to something the customer trusts." },
  { l: "Expand", h: "Protect more agents and systems", p: "More teams; endpoints, APIs, MCP, databases, cloud, SaaS. Contracts written once apply everywhere the planes reach.", g: "From one use case to a broader security deployment." },
  { l: "Standardize", h: "The authorization layer for AI agents", p: "Agents come and go. Wrapbox remains the control layer around what they may do — the record auditors ask for.", g: "Part of the company's AI security infrastructure." },
];
const SHOT = document.documentElement.dataset.shot === "1";
// Illustrative annual recurring revenue if the land → expand motion works: customers × average
// contract (devices + governed systems + platform). Assumptions, not a forecast of actuals.
const SCENARIO_MODEL = [
  { y: "Year 1", n: "3 design partners · ~$60k ACV", arr: 0.18 },
  { y: "Year 2", n: "12 customers · ~$120k ACV", arr: 1.4 },
  { y: "Year 3", n: "35 customers · ~$180k ACV", arr: 6.3 },
];
const MARKET = [
  { id: "market-2", v: "$4.8B", l: "Gartner's market for securing AI in 2027 — up 68.7% from $2.835B in 2026, almost $7.7B by 2028" },
  { id: "market-3", v: "+73%", l: "growth of the “AI usage control” segment to $749M in 2027; AI gateway +70.9% to $429M — the two slices Wrapbox sits in" },
];
const ANCHORS = [
  { id: "pricing-1", t: "GitHub Copilot $19–$39 per seat / month" },
  { id: "pricing-2", t: "Cursor $40–$120 per user / month" },
  { id: "pricing-6", t: "CrowdStrike Falcon $60–$185 per device / year" },
];
export function Business() {
  const market = MARKET.map((x) => ({ ...x, c: claimById(x.id) }));
  const pricing = ANCHORS.map((x) => ({ ...x, c: claimById(x.id) }));
  const gtm = claimById("pricing-15");
  const srcIds = [...ANCHORS.map((a) => a.id), ...MARKET.map((m) => m.id), "pricing-15"];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 14 }}>
      <div>
        <Reveal><Eyebrow>05 · Business & GTM</Eyebrow></Reveal>
        <Reveal i={1}><Display sm style={{ fontSize: 54 }}>Start with one real problem. <em>Expand across the enterprise.</em></Display></Reveal>
      </div>
      <div className="journey" style={{ marginTop: 2 }}>
        {GTM.map((s, k) => (
          <Reveal key={s.l} i={k + 2} className={`jn ${k === GTM.length - 1 ? "last" : ""}`}>
            <div className="dot">{k + 1}</div>
            {k < GTM.length - 1 && <div className="bar" />}
            <div className="jl">{s.l}</div>
            <h3 style={{ fontSize: 19, marginTop: 18 }}>{s.h}</h3>
            <p style={{ fontSize: 13.5, marginTop: 6 }}>{s.p}</p>
            <div className="goal" style={{ fontSize: 12, marginTop: 8, paddingTop: 8 }}>Goal: {s.g}</div>
          </Reveal>
        ))}
      </div>
      {gtm && <Reveal i={6} className="small" style={{ fontSize: 13, marginTop: -8 }}>Why land small: expansion deals close in 52 days versus 91 for new business, and win 45% of the time versus 18%.<sup className="sup">{srcIds.length}</sup></Reveal>}
      <div className="cols cols-2" style={{ gap: 24, marginTop: "auto", alignItems: "stretch" }}>
        <Reveal i={6} className="card" style={{ padding: "14px 18px" }}>
          <div className="small mono" style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Packaging — priced where the value is felt</div>
          <div className="cols cols-3" style={{ gap: 12 }}>
            {[["Endpoint", "per protected device / month", "Runtime on the laptop: file, process, secrets, uploads"], ["Gateway", "per governed system / month", "GitHub · SQL · cloud · SaaS · MCP in front of one resource"], ["Platform", "annual", "Core Brain, Intent Studio, Safety Kernel updates, evidence retention, SSO"]].map(([t, u, d]) => (
              <div key={t} className="tile" style={{ padding: "10px 12px" }}><div style={{ fontWeight: 700, fontSize: 15 }}>{t}</div><div className="mono" style={{ fontSize: 11, color: "var(--acc)", marginTop: 2 }}>{u}</div><div className="small" style={{ fontSize: 12, marginTop: 5, lineHeight: 1.4 }}>{d}</div></div>
            ))}
          </div>
          <div className="small" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>Anchored on what the same buyers already pay: {pricing.map((p, k) => <span key={p.id}>{p.t}<sup className="sup">{k + 1}</sup>{k < pricing.length - 1 ? " · " : ""}</span>)} — a governance seat at a fraction of the agent seat sits inside an existing line item.</div>
        </Reveal>
        <Reveal i={7} className="card" style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "1fr 1.15fr", gap: 16 }}>
          <div className="stack" style={{ gap: 8 }}>
            <div className="small mono" style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" }}>Market frame</div>
            {market.map((x, k) => <div key={x.id}><div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>{x.v}<sup className="sup">{pricing.length + k + 1}</sup></div><div className="small" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.4 }}>{x.l}{x.c && <span className="mono" style={{ display: "block", fontSize: 10.5, marginTop: 2 }}>{x.c.source_org} · {fmtDate(x.c.published)}</span>}</div></div>)}
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <div className="small mono" style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" }}>Illustrative 3-year scenario — assumptions, not actuals</div>
            <div className="bars" style={{ gap: 7 }}>
              {SCENARIO_MODEL.map((y) => (
                <div key={y.y} className="bar-row" style={{ gridTemplateColumns: "170px 1fr 60px" }}>
                  <span style={{ fontSize: 12.5, lineHeight: 1.3 }}><b>{y.y}</b> <span className="muted">· {y.n}</span></span>
                  <span className="tr" style={{ height: 10 }}><motion.span className="fl" initial={SHOT ? false : { scaleX: 0 }} animate={{ scaleX: y.arr / SCENARIO_MODEL[SCENARIO_MODEL.length - 1].arr }} transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ display: "block" }} /></span>
                  <span className="vv" style={{ fontSize: 14 }}>${y.arr >= 1 ? y.arr.toFixed(1) + "M" : Math.round(y.arr * 1000) + "k"}</span>
                </div>
              ))}
            </div>
            <div className="honest" style={{ fontSize: 12, padding: "7px 11px", lineHeight: 1.4 }}><b>Stage-honest:</b> a prototype with simulated integrations — no revenue or customers yet. Assumes ~$12 per device and ~$1.5k per governed system per month plus platform; 3 design partners first, then expand by seats and systems.</div>
          </div>
        </Reveal>
      </div>
      <Sources ids={srcIds} />
    </div>
  );
}

/* ---------- 14 · built ---------- */
const DECIDE_SRC = `// engine/brain.ts — the single matcher behind every screen
export function decide(req: ActionRequest, contracts: IntentContract[]): BrainResult {
  // 1. UNINSPECTABLE + protected clause → fail closed
  if (req.inspection && !req.inspection.inspectable && protectedApplies(req)) {
    return finish(req, { decision: "BLOCK", decidedBy: { layer: "uninspectable" } });
  }
  // 2. Intent Contracts — strictest matched clause wins
  let contractDecision: Decision = "ALLOW";
  for (const c of active(contracts)) for (const cl of c.clauses) {
    if (!clauseMatches(cl, req, classes)) continue;
    if (RANK[cl.effect] > RANK[contractDecision]) contractDecision = cl.effect;
  }
  // 3. Safety Kernel — vendor-managed, observe → enforce
  const { enforced, observed } = kernelHits(kernelFacts(req), req.kernel, req.now);
  // 4. precedence · 5. Blast-Radius Governor · 6. Context · 7. Task envelope
  // 7b. Standing permission · 8. Default: allow & record
  // 9. Break-glass lifts REVIEW/BLOCK from company rules — never a Kernel hit
  return finish(req, combine(contractDecision, enforced, blast(req), context(req)));
}`;
export function Built({ active }: SlideProps) {
  const pages = 20;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>06 · Under the hood</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>How it's <em>built.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>React 18 · TypeScript strict · Vite. No framework magic between the screens and the engine: one store, one matcher, typed registries, node:test. The excerpt on the right is the real shape of <span className="mono">decide()</span>.</Lead></Reveal>
      </div>
      <div className="cols cols-2" style={{ flex: 1, minHeight: 0, gap: 36, alignItems: "stretch" }}>
        <div className="stack" style={{ gap: 18 }}>
          <div className="cols cols-3" style={{ gap: 18 }}>
            <Stat i={2} md value={<CountUp to={pages} />} label="screens" sub="all derived from one store" />
            <Stat i={3} md value={<CountUp to={70} />} label="tests passing" sub="engine, store, onboarding, break-glass" />
            <Stat i={4} md value={<CountUp to={SCENARIOS.length} />} label="scenarios" sub="every effect, plane and boundary" />
          </div>
          <Reveal i={5} className="card" style={{ padding: "16px 20px" }}>
            <div className="small mono" style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>Registries the engine runs on</div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {[[CAPABILITIES.length, "capabilities"], [DETECTORS.length, "detectors"], [DATA_TYPES.length, "data types"], [TRANSFORMS.length, "transforms"], [DESTINATIONS.length, "destination classes"], [ACTION_NORMALIZATION.length, "action normalizations"], [KERNEL_RULES.length, "kernel rules"], [SEED_CONTRACTS.length, "seed contracts"]].map(([n, l]) => <Pill key={String(l)}><b>{n}</b>&nbsp;{l}</Pill>)}
            </div>
          </Reveal>
          <Reveal i={6} className="honest"><b>What is real:</b> every decision, transform, review, coverage figure, kernel lifecycle and evidence hash. <b>What is simulated:</b> the vendor integrations — GitHub App install, MDM push, SSO, SQL/AWS/Stripe gateways, detector fixtures — built as realistic flows with representative states, never as fake results.</Reveal>
          <Reveal i={7} className="small">Engineering standard, written before the first screen: <em>“Prototype the infrastructure. Never prototype the correctness.”</em></Reveal>
        </div>
        <Reveal i={3} style={{ minHeight: 0, display: "flex" }}><TypeCode code={DECIDE_SRC} lang="ts" title="src/engine/brain.ts" active={active} cps={70} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} /></Reveal>
      </div>
    </div>
  );
}

/* ---------- 15 · next ---------- */
const ROADMAP = [
  { h: "Endpoint runtime", p: "macOS Endpoint Security + Windows minifilter behind the same ActionRequest; pushed by Jamf / Intune profiles the onboarding already models." },
  { h: "Network Extension", p: "System extension + content filter for HTTPS/WebSocket; QUIC downgrade policy; the detector registry moves from fixtures to live parsers." },
  { h: "Gateways", p: "GitHub App, SQL proxy with row estimates, AWS broker role, SaaS key swap, MCP gateway with the 2025-06 authorization spec." },
  { h: "Identity & evidence", p: "SSO / SCIM for approvers, signed evidence export to SIEM, retention policies — the audit trail as a product surface." },
];
export function Next() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 28 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>07 · Next</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>From prototype <em>to production.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 18 }}>The engine, the model and the screens are the product. What remains is the plumbing I deliberately simulated — each piece a known engineering job with a known vendor surface, not an open research question.</Lead></Reveal>
      </div>
      <div className="cols cols-4" style={{ gap: 18 }}>
        {ROADMAP.map((r, k) => <Reveal key={r.h} i={k + 2} className="card" style={{ padding: "20px 22px" }}><div className="mono" style={{ fontSize: 12, color: "var(--acc)", marginBottom: 8 }}>0{k + 1}</div><div className="h3" style={{ fontSize: 20 }}>{r.h}</div><p className="small" style={{ fontSize: 14, marginTop: 8, color: "var(--ink-2)" }}>{r.p}</p></Reveal>)}
      </div>
      <div className="cols cols-2" style={{ gap: 28, marginTop: "auto", alignItems: "end" }}>
        <Reveal i={6} className="card tint" style={{ padding: "20px 24px" }}>
          <div className="small mono" style={{ fontSize: 11.5, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 8 }}>With a design partner, the first 90 days</div>
          <p className="body" style={{ fontSize: 16 }}>One team already using coding agents. Their own intent contracts in Intent Studio. Runtime on their laptops, one gateway in front of their most sensitive system — and the Coverage Map telling the truth about the rest.</p>
        </Reveal>
        <Reveal i={7} style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end", textAlign: "right" }}>
          <div className="display sm" style={{ fontSize: 44 }}>Thank you.</div>
          <div className="body">Bharath Salla · Wrapbox</div>
          <div className="row" style={{ gap: 8 }}><Pill>github.com/bharath-codes-max/wrapbox-real-prototype</Pill></div>
          <div className="small">Press <span className="kbd">Home</span> to start over</div>
        </Reveal>
      </div>
    </div>
  );
}
