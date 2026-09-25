// Cover · Understand · Research (numbers, the gap)
import { useEffect, useMemo, useState } from "react";
import type { SlideProps } from "../deck";
import { Display, Eyebrow, Lead, Reveal, Head, Stat, Sources, Brand, Donut, claimById, fmtDate } from "../ui";
import { research } from "../data/research";
import { decideOnce, scenario } from "../live";
import { pipelineFor } from "../../engine/simulate";
import { AgentTerminal } from "../../ui/agent-terminal";
import type { SimulationEvent } from "../../model/types";

/* ---------- cover ---------- */
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
    <div className="cols cols-53" style={{ height: "100%", alignItems: "stretch", gap: 56 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <Reveal><Eyebrow>Product portfolio · Bharath Salla</Eyebrow></Reveal>
        <Reveal i={1}><Display>Runtime authorization for <em>AI agents.</em></Display></Reveal>
        <Reveal i={2}><Lead>Every consequential action an agent takes — checked before it runs.</Lead></Reveal>
        <Reveal i={3} className="row" style={{ gap: 14, marginTop: 6 }}>
          <span className="small">Governs</span>
          <div className="brand-row">{["claudecode", "codex", "cursor", "githubcopilot", "openai", "microsoft", "mcp"].map((l) => <Brand key={l} name={l} size={38} />)}</div>
          <span className="small">and your own agents</span>
        </Reveal>
      </div>
      <Reveal i={2} style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}><AutoTerm active={active} /></div>
      </Reveal>
    </div>
  );
}

/* ---------- understand: incident timeline ---------- */
const INCIDENTS = [
  { id: "incidents-1", when: "Jul 2025", brands: ["replit"], metric: "4,000", unit: "fictional records written after eleven all-caps “no”s", h: "Told no eleven times. Deleted production anyway.", src: "The Register" },
  { id: "incidents-8", when: "Jul 2025", brands: ["cursor", "supabase"], metric: "1 ticket", unit: "with hidden instructions leaked the integration_tokens table", h: "A support ticket became a command.", src: "General Analysis" },
  { id: "incidents-11", when: "Aug 2025", brands: ["nx", "wiz"], metric: "5,500+", unit: "private repos made public · 1,000+ GitHub tokens", h: "The attacker used the victim's own agent.", src: "Wiz Research" },
  { id: "incidents-12", when: "Apr 2026", brands: ["cursor"], metric: "9 s", unit: "to delete the production database and every backup", h: "Nine seconds.", src: "Euronews" },
];
export function Understand() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Head eyebrow="Understand · 01" title={<>Agents don't ask. <em>They act.</em></>} lead="I started from documented failures, not hypotheticals. Four vendors, one shape: a capable agent, a legitimate task, one action nobody authorized." />
      <div className="tl" style={{ flex: 1, alignItems: "stretch" }}>
        {INCIDENTS.map((x, k) => (
          <Reveal key={x.id} i={k + 2} className="tn">
            <span className="dot" /><span className="when">{x.when}</span>
            <div className="card" style={{ padding: "24px 26px" }}>
              <div className="brand-row">{x.brands.map((b) => <Brand key={b} name={b} size={44} />)}</div>
              <div className="metric">{x.metric}<small>{x.unit}</small></div>
              <div className="h3" style={{ fontSize: 24, marginTop: 6 }}>{x.h}<sup className="sup">{k + 1}</sup></div>
              <div className="small" style={{ fontSize: 15, marginTop: "auto" }}>{x.src} · {fmtDate(claimById(x.id)?.published ?? "")}</div>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal i={6} className="card acc" style={{ marginTop: 22, padding: "18px 26px", display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>In every case the “don't” lived in a prompt. Nothing outside the model stood between the agent and the action.</span>
      </Reveal>
      <Sources ids={INCIDENTS.map((x) => x.id)} />
    </div>
  );
}

/* ---------- research: the numbers ---------- */
const NUMBERS = [
  { id: "adoption-13", v: "15×", l: "growth in active agents inside Microsoft 365, year over year", brand: "microsoft" },
  { id: "adoption-14", v: "223", l: "genAI data-policy violations per organization, every month", brand: "netskope" },
  { id: "adoption-6", v: "40%", l: "of enterprises will demote or decommission autonomous agents by 2027", brand: "gartner" },
];
export function Numbers() {
  const ibm = claimById("adoption-10");
  const topics = Object.entries(research.topics).map(([k, v]) => ({ k, n: v.claims.length }));
  const total = topics.reduce((a, t) => a + t.n, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Head eyebrow="Research · 02" title={<>Everyone is deploying. <em>Almost no one is authorizing.</em></>} lead="Agents are growing an order of magnitude a year; access control is not keeping up; the breaches have started." />
      <div className="cols" style={{ gridTemplateColumns: "560px 1fr", gap: 56, flex: 1, alignItems: "center" }}>
        <Reveal i={2} className="card tint" style={{ display: "flex", alignItems: "center", gap: 28, padding: "26px 30px" }}>
          <Donut pct={92} size={250} stroke={28} label="92%" />
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>of organizations breached through AI lacked proper AI access controls<sup className="sup">1</sup></div>
            <div className="small" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}><Brand name="ibm" size={22} />IBM Cost of a Data Breach 2026 · {ibm ? fmtDate(ibm.published) : ""}</div>
          </div>
        </Reveal>
        <div className="stack" style={{ gap: 18 }}>
          {NUMBERS.map((s, k) => { const c = claimById(s.id); return (
            <Reveal key={s.id} i={k + 3} className="tile" style={{ display: "grid", gridTemplateColumns: "150px 1fr auto", alignItems: "center", gap: 20, padding: "16px 22px" }}>
              <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-0.04em", color: "var(--acc)", lineHeight: 1 }}>{s.v}<sup className="sup">{k + 2}</sup></span>
              <span style={{ fontSize: 19, lineHeight: 1.35 }}>{s.l}<span className="small" style={{ display: "block", fontSize: 14, marginTop: 3 }}>{c?.source_org} · {c ? fmtDate(c.published) : ""}</span></span>
              <Brand name={s.brand} size={40} />
            </Reveal>
          ); })}
        </div>
      </div>
      <Reveal i={6} className="row" style={{ gap: 18, marginTop: 18 }}>
        <span className="label">Research corpus</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{total} claims, each re-fetched from its source before use</span>
        <span className="row" style={{ gap: 6, marginLeft: 8 }}>
          {topics.map((t) => <span key={t.k} className="row" style={{ gap: 5, fontSize: 14, color: "var(--ink-3)" }}><span style={{ width: Math.max(18, t.n * 3), height: 10, borderRadius: 5, background: "var(--acc)", display: "inline-block", opacity: 0.85 }} />{t.k} {t.n}</span>)}
        </span>
      </Reveal>
      <Sources ids={["adoption-10", ...NUMBERS.map((s) => s.id)]} />
    </div>
  );
}

/* ---------- research: the gap (action path) ---------- */
const PATH = [
  { t: "Identity · SSO", a: "who may log in", brands: ["okta"] },
  { t: "Network · DLP", a: "what bytes leave", brands: ["netskope", "zscaler"] },
  { t: "AI gateway", a: "what the model is told", brands: ["kong", "cloudflare"] },
];
const STANDARDS = [
  { ids: ["regulation-10", "regulation-9"], brand: "owasp", t: "OWASP LLM Top 10 · 2025", s: "Authorization checks “must not be delegated to the LLM”; high-impact actions need human approval." },
  { ids: ["regulation-4", "regulation-5"], brand: "flag-eu", t: "EU AI Act · Art. 14 & 12", s: "A person must be able to stop the system; events must be logged automatically for traceability." },
  { ids: ["regulation-7"], brand: "nist", t: "NIST SP 800-53 overlays · 2025", s: "Two of the five proposed overlays are for AI agents — coding assistants and MCP included." },
];
export function Gap() {
  const src = STANDARDS.flatMap((s) => s.ids);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Head eyebrow="Research · 03" title={<>The gap is <em>the moment of execution.</em></>} lead="Every existing control answers a different question. None of them stands where the agent acts." />
      <Reveal i={2} style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 1fr 1.4fr 170px", gap: 14, alignItems: "stretch", minHeight: 250 }}>
        <div className="tile" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}><div className="label">Person</div><div style={{ fontSize: 19, fontWeight: 600 }}>asks an agent to do a task</div></div>
        {PATH.map((p) => (
          <div key={p.t} className="tile" style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            <div className="brand-row">{p.brands.map((b) => <Brand key={b} name={b} size={36} />)}</div>
            <div style={{ fontSize: 21, fontWeight: 700 }}>{p.t}</div>
            <div className="small" style={{ fontSize: 16 }}>answers: <b style={{ color: "var(--ink-2)" }}>{p.a}</b></div>
          </div>
        ))}
        <div className="tile" style={{ background: "var(--acc)", color: "var(--acc-ink)", borderColor: "transparent", display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
          <div style={{ font: "700 12.5px var(--sans)", letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.85 }}>The action — nobody decides here</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15 }}>read · upload · push · query · deploy</div>
          <div style={{ fontSize: 16, opacity: 0.92 }}>Where Wrapbox sits: ALLOW · CONSTRAIN · REVIEW · BLOCK, before it happens.</div>
        </div>
        <div className="tile" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}><div className="label">Resource</div><div className="brand-row">{["github_light", "postgresql", "aws"].map((b) => <Brand key={b} name={b} size={36} />)}</div></div>
      </Reveal>
      <Reveal i={3} className="label" style={{ margin: "34px 0 14px" }}>Why it is becoming a requirement</Reveal>
      <div className="cols cols-3" style={{ gap: 18 }}>
        {STANDARDS.map((s, k) => {
          const n = src.indexOf(s.ids[0]) + 1;
          return (
            <Reveal key={s.t} i={k + 4} className="card" style={{ display: "flex", gap: 20, alignItems: "flex-start", padding: "24px 26px" }}>
              <Brand name={s.brand} size={54} />
              <div><div style={{ fontSize: 21, fontWeight: 700 }}>{s.t}<sup className="sup">{n}{s.ids.length > 1 ? `,${n + 1}` : ""}</sup></div><div className="body" style={{ fontSize: 17, marginTop: 8 }}>{s.s}</div></div>
            </Reveal>
          );
        })}
      </div>
      <Sources ids={src} />
    </div>
  );
}

export { Stat };
