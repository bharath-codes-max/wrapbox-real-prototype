// Slides 1–5: cover, the problem, the numbers, the gap, the journey.
import { useEffect, useMemo, useState } from "react";
import type { SlideProps } from "../deck";
import { Display, Eyebrow, Lead, Reveal, Stat, Sources, Pill, Logo, claimById, fmtDate, Lightbox } from "../ui";
import { decideOnce, scenario } from "../live";
import { pipelineFor } from "../../engine/simulate";
import { AgentTerminal } from "../../ui/agent-terminal";
import type { SimulationEvent } from "../../model/types";

/* ---------- cover: a real trace runs while the title sits ---------- */
const COVER_IDS = ["ep-read-env", "net-pii-approved", "gw-force-main", "ep-run-tests"];
function AutoTerm({ active }: { active: boolean }) {
  const [i, setI] = useState(0);
  const [event, setEvent] = useState<SimulationEvent | null>(null);
  const [visible, setVisible] = useState(0);
  const sc = scenario(COVER_IDS[i % COVER_IDS.length]);
  const stages = useMemo(() => (event ? pipelineFor(sc, event) : []), [sc, event]);
  useEffect(() => { if (!active) return; const t = setTimeout(() => { setEvent(decideOnce(sc, "genesis")); setVisible(0); }, 900); return () => clearTimeout(t); }, [active, sc]);
  useEffect(() => {
    if (!event) return;
    if (visible < stages.length) { const t = setTimeout(() => setVisible((v) => v + 1), 480); return () => clearTimeout(t); }
    const t = setTimeout(() => { setEvent(null); setI((k) => k + 1); }, 2600); return () => clearTimeout(t);
  }, [event, visible, stages.length]);
  return <AgentTerminal scenario={sc} event={event} stages={stages} visible={visible} />;
}

export function Cover({ active }: SlideProps) {
  return (
    <div className="cols cols-53" style={{ height: "100%", alignItems: "stretch" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 26 }}>
        <Reveal><Eyebrow>Product portfolio · 2026</Eyebrow></Reveal>
        <Reveal i={1}><Display>Runtime authorization for <em>AI agents.</em></Display></Reveal>
        <Reveal i={2}><Lead>Agents now act faster than anyone can say no. Wrapbox is the layer that decides — at the moment an agent reads, uploads, pushes, queries or deploys — whether it may, with intent written in plain English and evidence for every decision.</Lead></Reveal>
        <Reveal i={3} className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <Pill acc>Bharath Salla</Pill>
          <Pill>Problem → research → concept → product</Pill>
          <Pill>Working prototype · v1.4</Pill>
        </Reveal>
        <Reveal i={4} className="row" style={{ gap: 14, marginTop: 8 }}>
          <span className="small">Governs</span>
          <div className="logo-row">{["claudecode", "codex", "cursor", "githubcopilot", "openai", "microsoft", "mcp"].map((l) => <Logo key={l} name={l} size={30} />)}</div>
          <span className="small">and your own agents</span>
        </Reveal>
      </div>
      <Reveal i={2} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}><AutoTerm active={active} /></div>
        <div className="small mono" style={{ marginTop: 10, fontSize: 12 }}>↑ live: the product's real decision engine running in this deck</div>
      </Reveal>
      <Lightbox />
    </div>
  );
}

/* ---------- 2 · the problem ---------- */
// Four documented incidents (every figure and date is on the cited source page).
const INCIDENTS = [
  { id: "incidents-1", h: "Told “no” eleven times. Deleted production anyway.", b: "July 2025: Replit's agent deleted SaaStr founder Jason Lemkin's production database despite eleven all-caps instructions not to change anything, generated 4,000 fictional records, and wrongly reported that a rollback was impossible.", blast: "The instruction lived in a prompt. Nothing stood between the agent and the database." },
  { id: "incidents-12", h: "Nine seconds: the database and every backup.", b: "April 2026: a Cursor agent running Claude Opus 4.6 deleted car-rental company PocketOS's entire production database and all of its backups in nine seconds — despite a system-prompt rule never to run destructive commands without approval.", blast: "30+ hours down; three months of reservations and sign-ups lost." },
  { id: "incidents-11", h: "The attacker used the victim's own agent.", b: "August 2025, s1ngularity Nx supply-chain attack: malware invoked victims' installed Claude, Gemini and Amazon Q CLIs with --dangerously-skip-permissions and --yolo to hunt for secrets on their machines.", blast: "1,000+ valid GitHub tokens leaked; 5,500+ private repositories made public across 400+ users and organizations." },
  { id: "incidents-8", h: "A support ticket became a command.", b: "July 2025: a customer-support ticket with hidden instructions made a Cursor agent using Supabase MCP — running with service_role privileges — read the integration_tokens table and write the OAuth tokens back into the attacker-visible ticket.", blast: "The agent's credentials were valid. Nobody judged the query against intent." },
];
export function Problem() {
  const cards = INCIDENTS.map((x) => ({ ...x, c: claimById(x.id) }));
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 22 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>01 · The problem</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>Agents don't ask. <em>They act.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 19 }}>I started with documented cases, not hypotheticals. Across 2025 and 2026 the shape repeats for every major agent: a capable agent, a legitimate task, one action nobody authorized — and the “don't” living in a prompt instead of an enforcement layer. In the supply-chain cases the attacker was upstream of the user entirely.</Lead></Reveal>
      </div>
      <div className="cols cols-4" style={{ gap: 18, flex: 1, alignItems: "stretch" }}>
        {cards.map((x, k) => (
          <Reveal key={x.id} i={k + 2} className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 22px" }}>
            <div className="row" style={{ justifyContent: "space-between" }}><span className="mono small" style={{ fontSize: 12 }}>{x.c ? fmtDate(x.c.published) : ""}</span><span className="chip block">INCIDENT</span></div>
            <div className="h3" style={{ fontSize: 21, lineHeight: 1.15 }}>{x.h}</div>
            <p className="body" style={{ fontSize: 14.5, lineHeight: 1.45 }}>{x.b}<sup className="sup">{k + 1}</sup></p>
            <p className="small" style={{ marginTop: "auto", fontSize: 13.5 }}><b style={{ color: "var(--ink-2)" }}>Blast radius —</b> {x.blast}</p>
            {x.c && <span className="small mono" style={{ fontSize: 11 }}>{x.c.source_org}</span>}
          </Reveal>
        ))}
      </div>
      <Sources ids={INCIDENTS.map((x) => x.id)} />
    </div>
  );
}

/* ---------- 3 · quantified ---------- */
const NUMBERS = [
  { id: "adoption-13", v: "15×", l: "year-over-year growth in active agents inside Microsoft 365 — 18× in large enterprises" },
  { id: "adoption-10", v: "92%", l: "of organizations breached through AI lacked proper AI access controls, in a record $4.99M average-breach year" },
  { id: "adoption-14", v: "223", l: "genAI data-policy violations per organization per month; source code is the top leaked category" },
  { id: "adoption-6", v: "40%", l: "of enterprises will demote or decommission autonomous agents by 2027 — governance gaps found only after production incidents" },
];
export function Quantified() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 30 }}>
      <div className="cols cols-53" style={{ alignItems: "end" }}>
        <div>
          <Reveal><Eyebrow>01 · The problem, quantified</Eyebrow></Reveal>
          <Reveal i={1}><Display sm>Everyone is deploying. <em>Almost no one is authorizing.</em></Display></Reveal>
        </div>
        <Reveal i={2}><Lead style={{ fontSize: 19 }}>Adoption ran ahead of control. The agent fleet grows an order of magnitude a year, most AI-related breaches happen where no access control exists, and data leaves to AI apps hundreds of times a month per company. Gartner's diagnosis of why agent programs fail: governance treated as binary — locked down or fully trusted.</Lead></Reveal>
      </div>
      <div className="cols cols-4" style={{ gap: 36, alignItems: "start", marginTop: 10 }}>
        {NUMBERS.map((s, k) => { const c = claimById(s.id); return <Stat key={s.id} i={k + 2} value={s.v} label={s.l} sub={c ? `${c.source_org} · ${fmtDate(c.published)}` : ""} n={k + 1} />; })}
      </div>
      <Reveal i={6} className="row" style={{ gap: 12, marginTop: "auto" }}>
        <span className="chip allow">ALLOW</span><span className="chip constrain">CONSTRAIN</span><span className="chip review">REVIEW</span><span className="chip block">BLOCK</span>
        <span className="small">— a graded decision at the moment of action is the opposite of a binary switch.</span>
      </Reveal>
      <Sources ids={NUMBERS.map((s) => s.id)} />
    </div>
  );
}

/* ---------- 4 · the gap ---------- */
const LAYERS = [
  { name: "Identity & SSO", scope: "who may log in", note: "Answers the human at the door — not what their agent does after." },
  { name: "DLP · CASB · SSE", scope: "what data leaves the network", note: "Sees bytes in flight; blind to files, processes and pushes on the laptop." },
  { name: "AI gateways · guardrails", scope: "what the model is told and says", note: "Guards prompts and completions — not the action taken with the answer." },
  { name: "The moment of execution", scope: "what the agent DOES", note: "Read, upload, push, query, deploy — this is where Wrapbox decides.", hero: true },
];
const DRIVERS = [
  { ids: ["regulation-10"], d: "2024-11", t: "OWASP LLM07:2025 — the system prompt is not a security control", s: "Authorization bounds checks “must not be delegated to the LLM”; they must happen deterministically and auditably, outside the model." },
  { ids: ["regulation-9"], d: "2024-11", t: "OWASP LLM06:2025 — Excessive Agency", s: "Minimum permissions, and a human approving high-impact actions before they are taken." },
  { ids: ["regulation-4"], d: "2024-07", t: "EU AI Act, Article 14 — human oversight", s: "High-risk systems must let a person intervene or interrupt through a “stop” procedure that halts the system in a safe state." },
  { ids: ["regulation-5", "regulation-2"], d: "2027-12", t: "EU AI Act, Article 12 — record-keeping", s: "Automatic recording of events over the system's lifetime, for traceability; high-risk obligations now apply from 2 Dec 2027 and 2 Aug 2028." },
  { ids: ["regulation-7"], d: "2025-08", t: "NIST SP 800-53 control overlays for AI", s: "Two of the five proposed overlays are for AI agents — citing enterprise copilots and coding assistants that use MCP." },
];
export function Gap() {
  const regs = DRIVERS;
  const srcIds = DRIVERS.flatMap((d) => d.ids);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 24 }}>
      <div>
        <Reveal><Eyebrow>02 · Research — existing controls</Eyebrow></Reveal>
        <Reveal i={1}><Display sm>The gap is <em>the moment of execution.</em></Display></Reveal>
      </div>
      <div className="cols cols-2" style={{ flex: 1, alignItems: "stretch", gap: 48 }}>
        <div className="stack" style={{ gap: 10 }}>
          {LAYERS.map((l, k) => (
            <Reveal key={l.name} i={k + 2} className={`card ${l.hero ? "ink" : ""}`} style={{ padding: "16px 22px", display: "grid", gridTemplateColumns: "230px 1fr", gap: 18, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>{l.name}</div>
                <div className="mono" style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{l.scope}</div>
              </div>
              <div style={{ fontSize: 15.5, lineHeight: 1.45, opacity: l.hero ? 1 : 0.85 }}>{l.note}</div>
            </Reveal>
          ))}
          <Reveal i={6} className="small" style={{ marginTop: 6 }}>Each layer is necessary. None of them stands between an agent and the action it is about to take.</Reveal>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <Reveal i={2} className="small mono" style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase" }}>Why it is becoming a requirement</Reveal>
          {regs.map((r, k) => {
            const n = srcIds.indexOf(r.ids[0]) + 1;
            return (
              <Reveal key={r.t} i={k + 3} className="tile" style={{ display: "grid", gridTemplateColumns: "76px 1fr", gap: 14, padding: "12px 16px" }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--acc)", fontWeight: 600, paddingTop: 3 }}>{r.d}</span>
                <div><div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{r.t}<sup className="sup">{n}{r.ids.length > 1 ? `,${n + 1}` : ""}</sup></div><div className="small" style={{ fontSize: 13, marginTop: 3 }}>{r.s}</div></div>
              </Reveal>
            );
          })}
        </div>
      </div>
      <Sources ids={srcIds} />
    </div>
  );
}

/* ---------- 5 · the journey ---------- */
const STEPS = [
  { l: "Observe", h: "Incidents, standards, and one recurring shape", p: "Every case I read had the same shape: a capable agent, a legitimate task, and one action nobody had authorized. The failure was never the model — it was the missing question at the moment of execution.", a: "Incident log · OWASP LLM06 · MCP authorization spec", g: "Frame the surface: file · process · upload · push · query · deploy." },
  { l: "Frame", h: "Three planes, four decisions, one matcher", p: "Endpoint, network and gateway are the only places an action can be held. Every decision reduces to ALLOW, CONSTRAIN, REVIEW or BLOCK. One normalized rule must feed Describe, Build, YAML, the tester and runtime — or screens contradict each other.", a: "8-week product & architecture blueprint", g: "Turn the shape into a system: planes, decisions, evidence." },
  { l: "Standard", h: "Prototype the infrastructure. Never the correctness.", p: "I set an engineering bar before the first screen: simulate expensive integrations, but never fake a decision. If a screen claims agent → action → policy → REVIEW, the engine must genuinely evaluate it. No hard-coded results, ever.", a: "Engineering standard (CLAUDE.md) · 10 rules", g: "A rule set the product could be held to — by me and by customers." },
  { l: "Build", h: "Twenty screens on one store and one engine", p: "Registries for detectors, capabilities and destinations; a decision engine with nine ordered checks; a vendor-managed Safety Kernel; hash-chained evidence; onboarding, review, break-glass, coverage — all reading one state, all tested.", a: "53 TypeScript files · 70 tests · one store", g: "A working product a security leader can push on." },
];
export function Journey() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 34 }}>
      <div>
        <Reveal><Eyebrow>03 · Concept — how I got here</Eyebrow></Reveal>
        <Reveal i={1}><Display sm>Start with the failure. <em>Design for the moment it happens.</em></Display></Reveal>
      </div>
      <div className="journey" style={{ flex: 1 }}>
        {STEPS.map((s, k) => (
          <Reveal key={s.l} i={k + 2} className={`jn ${k === STEPS.length - 1 ? "last" : ""}`}>
            <div className="dot">{k + 1}</div>
            {k < STEPS.length - 1 && <div className="bar" />}
            <div className="jl">{s.l}</div>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
            <div className="small mono" style={{ fontSize: 12, marginTop: 14, color: "var(--acc)" }}>→ {s.a}</div>
            <div className="goal">Goal: {s.g}</div>
          </Reveal>
        ))}
      </div>
      <Reveal i={6} className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {["Intent in plain English", "Decide at the moment of action", "One normalized rule, one matcher", "Never fake capability", "Evidence for every decision", "Humans only where they add judgement"].map((p) => <Pill key={p}>{p}</Pill>)}
      </Reveal>
    </div>
  );
}

