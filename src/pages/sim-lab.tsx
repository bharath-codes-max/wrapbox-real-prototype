// Simulation Lab — the primary demo experience. LEFT: what the person/agent
// sees. RIGHT: what Wrapbox sees and does. Scenarios run through the real
// engine, record real events, and propagate to every other screen.
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState, simulate, shadowEvaluate } from "../state/store";
import { SEED_CONTRACTS } from "../model/contracts";
import { BASELINE_KERNEL } from "../engine/kernel";
import { PageHead, Chip, DecisionChip, SimNote, Payload, names, Avatar, AgentMark, DestMark, SectionHead } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import { SCENARIOS, type Scenario } from "../engine/scenarios";
import { pipelineFor, buildInspection, type PipelineStage } from "../engine/simulate";
import type { Decision, SimulationEvent } from "../model/types";
import { agentById, userById } from "../model/org";
import { destById } from "../model/registries";
import { Network, Server, ShieldCheck, Layers, Cpu, Play, Pause, StepForward, RotateCcw, ArrowRight } from "lucide-react";

const GROUPS = [
  { key: "NETWORK", label: "Network" },
  { key: "ENDPOINT", label: "Endpoint" },
  { key: "GATEWAY", label: "Gateway" },
  { key: "CONTEXT", label: "Context" },
  { key: "SAFETY", label: "Safety Kernel" },
] as const;

const GROUP_ICON = {
  NETWORK: <Network size={13} />,
  ENDPOINT: <Server size={13} />,
  GATEWAY: <ShieldCheck size={13} />,
  CONTEXT: <Layers size={13} />,
  SAFETY: <Cpu size={13} />,
};

export function SimulationLab({ nav, route }: { nav: (r: string) => void; route: string }) {
  const s = useAppState();
  const sub = route.split("/")[1]?.toUpperCase();
  const [group, setGroup] = useState<string>(GROUPS.some((g) => g.key === sub) ? sub! : "NETWORK");
  const [scenarioId, setScenarioId] = useState<string>(() => SCENARIOS.find((x) => x.group === (GROUPS.some((g) => g.key === sub) ? sub : "NETWORK"))!.id);
  const sc = SCENARIOS.find((x) => x.id === scenarioId)!;

  const [event, setEvent] = useState<SimulationEvent | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [visible, setVisible] = useState(0); // stages revealed
  const [mode, setMode] = useState<"idle" | "auto" | "step" | "done">("idle");
  const [openDetail, setOpenDetail] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pick = (g: string) => {
    setGroup(g);
    const first = SCENARIOS.find((x) => x.group === g)!;
    setScenarioId(first.id);
    reset();
  };
  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setEvent(null); setStages([]); setVisible(0); setMode("idle");
  };

  const start = (auto: boolean) => {
    if (timer.current) clearInterval(timer.current);
    const ev = simulate(sc); // real event, recorded in the store
    const st = pipelineFor(sc, ev);
    setEvent(ev); setStages(st); setVisible(1);
    setMode(auto ? "auto" : "step");
    if (auto) {
      let i = 1;
      timer.current = setInterval(() => {
        i += 1;
        setVisible(i);
        if (i >= st.length) {
          if (timer.current) clearInterval(timer.current);
          setMode("done");
        }
      }, 650);
    }
  };
  const stepOnce = () => {
    if (!event) { start(false); return; }
    setVisible((v) => {
      const nv = Math.min(stages.length, v + 1);
      if (nv >= stages.length) setMode("done");
      return nv;
    });
  };
  const pause = () => {
    if (timer.current) clearInterval(timer.current);
    setMode("step");
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const finished = mode === "done" || (event !== null && visible >= stages.length);
  const liveEvent = event ? s.events.find((e) => e.id === event.id) ?? event : null;
  const inspectionPreview = useMemo(() => buildInspection(sc), [sc]);

  const groupScenarios = SCENARIOS.filter((x) => x.group === group);
  const groupLabel = GROUPS.find((g) => g.key === group)?.label ?? "";
  // What each scenario resolves to under the rules active right now, vs the
  // original demo policy — a pure what-if through the same Core Brain.
  const outlook = useMemo(() => {
    const out: Record<string, { current: Decision; baseline: Decision }> = {};
    for (const x of SCENARIOS.filter((y) => y.group === group)) {
      out[x.id] = { current: shadowEvaluate(x, s.contracts), baseline: shadowEvaluate(x, SEED_CONTRACTS, BASELINE_KERNEL) };
    }
    return out;
  }, [group, s.contracts, s.kernel]);

  return (
    <div className="page">
      <PageHead
        eyebrow="Simulation"
        title="Simulation Lab"
        sub="What the person or agent is doing — versus what Wrapbox sees and does. Every run records a real event that propagates to the Control Room, Live Actions, Review Center and Evidence."
        right={<SimNote>Environments simulated · decisions & state real</SimNote>}
      />

      <div className="section">
        <SectionHead title="Enforcement plane" sub="Choose the plane to simulate, then pick a scenario within it." />
        <div className="row" style={{ flexWrap: "wrap" }}>
          {GROUPS.map((g) => (
            <button key={g.key} className={`btn btn-sm ${group === g.key ? "btn-primary" : ""}`} onClick={() => pick(g.key)}>
              {GROUP_ICON[g.key]} {g.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
        {/* Scenario picker */}
        <div className="section">
          <SectionHead title="Scenarios" sub={`${groupScenarios.length} in the ${groupLabel} plane`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groupScenarios.map((x) => (
              <div
                key={x.id}
                className="card rowlink"
                onClick={() => { setScenarioId(x.id); reset(); }}
                style={{
                  cursor: "pointer", padding: "12px 14px",
                  borderColor: x.id === scenarioId ? "var(--accent)" : "var(--border)",
                  boxShadow: x.id === scenarioId ? "0 0 0 1px var(--accent)" : undefined,
                }}
              >
                <b className="small">{x.title}</b>
                {(() => {
                  const now = outlook[x.id];
                  if (!now) return null;
                  const changed = now.current !== now.baseline;
                  const note = x.expected.includes(" — ") ? x.expected.split(" — ")[1] : "";
                  return (
                    <div className="row small" style={{ marginTop: 6, gap: 6 }}>
                      <span className="faint">Right now:</span>
                      <DecisionChip d={now.current} small />
                      {changed
                        ? <span style={{ color: "var(--review)" }}>changed by current policy (was {now.baseline})</span>
                        : note && <span className="faint">{note}</span>}
                    </div>
                  );
                })()}
              </div>
            ))}
            {group === "GATEWAY" && (
              <div className="small faint" style={{ padding: "4px 4px 0" }}>
                The 10-step park/resume task lives in <a onClick={() => nav("tasks")}>Tasks</a>.
              </div>
            )}
          </div>
        </div>

        {/* Stage */}
        <div className="section">
          <div className="card">
            <div className="spread">
              <div>
                <b>{sc.title}</b>
                <div className="small dim">{sc.narrative}</div>
              </div>
              <div className="row">
                {mode === "idle" && <>
                  <button className="btn btn-primary btn-sm" onClick={() => start(true)}><Play size={13} /> Run</button>
                  <button className="btn btn-sm" onClick={() => start(false)}>Step through</button>
                </>}
                {mode === "auto" && <button className="btn btn-sm" onClick={pause}><Pause size={13} /> Pause</button>}
                {mode === "step" && !finished && <button className="btn btn-primary btn-sm" onClick={stepOnce}><StepForward size={13} /> Next step</button>}
                {(finished || mode !== "idle") && <button className="btn btn-ghost btn-sm" onClick={reset}><RotateCcw size={13} /> Reset</button>}
              </div>
            </div>
          </div>

          <div className="reality">
            {/* LEFT — what the human/agent sees */}
            <div>
              <div className="payload-title dim">WHAT {sc.plane === "NETWORK" ? "THE EMPLOYEE" : "THE AGENT"} SEES</div>
              {sc.plane === "NETWORK" ? (
                <div className="browser-frame">
                  <div className="browser-bar">
                    <div className="term-chrome"><i /><i /><i /></div>
                    <div className="browser-url" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {sc.destination && <DestMark destId={sc.destination} size={13} />}
                      https://{sc.destination ? destById(sc.destination)?.host : "app.example"}/
                    </div>
                  </div>
                  <div className="browser-body">
                    <div className="chat-bubble">
                      <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                        <Avatar userId={sc.user} size={18} />
                        <b className="small">{userById(sc.user)?.name}</b>
                      </span>
                      <div className="small dim" style={{ marginTop: 2 }}>
                        {sc.id === "net-pii-approved" && "Here's our customer list — draft a personalised renewal email for each."}
                        {sc.id === "net-cred-approved" && "Why is this service failing? Config attached."}
                        {sc.id === "net-code-approved" && "Refactor this checkout module for readability."}
                        {sc.id === "net-code-unapproved" && "Optimize this code for me."}
                        {sc.id === "net-encrypted" && "Summarise the records in this archive."}
                        {sc.id === "net-unknown-dest" && "(background process posting data…)"}
                        {sc.id === "sk-privkey-exfil" && "(unknown process posting ~/.ssh/id_rsa…)"}
                      </div>
                      {sc.fileName && (
                        <div style={{ marginTop: 6 }}>
                          <span className="attach-chip">📎 {sc.fileName}</span>
                        </div>
                      )}
                    </div>
                    {!event && <div className="small faint">Press Send (Run) to transmit…</div>}
                    {event && !finished && <div className="small dim">Transmitting…</div>}
                    {finished && liveEvent && (
                      <>
                        {liveEvent.decision === "ALLOW" && (
                          <div className="chat-bubble" style={{ borderColor: "var(--good)" }}>
                            <b className="small" style={{ color: "var(--good)" }}>✓ Delivered</b>
                            <div className="small dim">The destination received the content. Normal work was not interrupted.</div>
                          </div>
                        )}
                        {liveEvent.decision === "CONSTRAIN" && liveEvent.payloadAfter && (
                          <div className="chat-bubble" style={{ borderColor: "var(--info)" }}>
                            <b className="small" style={{ color: "var(--info)" }}>✓ Delivered — protected</b>
                            <div className="small dim" style={{ marginBottom: 6 }}>What the destination actually received:</div>
                            <Payload title="" text={liveEvent.payloadAfter} highlight="tokens" />
                          </div>
                        )}
                        {liveEvent.decision === "BLOCK" && (
                          <div className="chat-bubble" style={{ borderColor: "var(--bad)" }}>
                            <b className="small" style={{ color: "var(--bad)" }}>⛔ Blocked by Wrapbox before transmission</b>
                            <div className="small dim">
                              {liveEvent.decidedBy ? `Decided by ${liveEvent.decidedBy.label}` : liveEvent.decisionReasons[0]}
                              {liveEvent.safeAlternative && <div style={{ marginTop: 4 }}><b>Safe next step:</b> {liveEvent.safeAlternative}</div>}
                            </div>
                          </div>
                        )}
                        {liveEvent.decision === "REVIEW" && (
                          <div className="chat-bubble" style={{ borderColor: "var(--warn)" }}>
                            <b className="small" style={{ color: "var(--warn)" }}>⏸ Held for approval</b>
                            <div className="small dim">This transfer needs a scoped approval. You can keep working — it resumes if approved in <a onClick={() => nav("reviews")}>Review Center</a>.</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="term">
                  <div className="term-chrome" style={{ alignItems: "center", gap: 8 }}>
                    <i /><i /><i />
                    <span style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <AgentMark agentId={sc.agent} size={13} />
                      <span className="dim">{userById(sc.user)?.name} · {agentById(sc.agent)?.name} · {sc.application}</span>
                    </span>
                  </div>
                  <span style={{ color: "var(--good)" }}>❯</span> {sc.actionRaw ?? sc.action.toLowerCase()}{"\n"}
                  {!event && <span className="faint">… press Run to execute</span>}
                  {event && !finished && <span className="dim">…</span>}
                  {finished && liveEvent && (
                    <>
                      {liveEvent.decision === "ALLOW" && <span style={{ color: "var(--good)" }}>{"✓ completed"}{sc.id === "ep-run-tests" ? "\n  42 passing (3.2s)" : ""}</span>}
                      {liveEvent.decision === "BLOCK" && (
                        <span style={{ color: "var(--bad)" }}>
                          {"⛔ wrapbox: action blocked\n"}
                          <span className="dim">{"   reason: "}{liveEvent.decidedBy?.label ?? liveEvent.decisionReasons[0]}{"\n"}</span>
                          {liveEvent.safeAlternative && <span className="dim">{"   hint: "}{liveEvent.safeAlternative}</span>}
                        </span>
                      )}
                      {liveEvent.decision === "REVIEW" && (
                        <span style={{ color: "var(--warn)" }}>
                          {"⏸ wrapbox: authorization required — request filed\n"}
                          <span className="dim">{"   the agent continues other safe work while this waits"}</span>
                        </span>
                      )}
                      {liveEvent.decision === "CONSTRAIN" && <span style={{ color: "var(--info)" }}>{"✓ completed with protective transform"}</span>}
                    </>
                  )}
                </div>
              )}

              {/* Before payload preview for content scenarios */}
              {sc.payload && (
                <div style={{ marginTop: 12 }}>
                  <Payload title={`ORIGINAL — ${sc.fileName ?? "content"}`} text={sc.payload} highlight="sensitive" />
                  {inspectionPreview && !inspectionPreview.inspectable && (
                    <div className="small faint" style={{ marginTop: 4 }}>Encrypted content — Wrapbox cannot read it, and says so.</div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT — what Wrapbox sees */}
            <div>
              <div className="payload-title dim">WHAT WRAPBOX SEES AND DOES</div>
              <div className="card" style={{ minHeight: 220 }}>
                {stages.length === 0 && (
                  <div className="empty">
                    Run the scenario to watch the {sc.plane.toLowerCase()} plane intercept, inspect, decide and enforce.
                  </div>
                )}
                <div className="pipe">
                  {stages.slice(0, visible).map((st, i) => (
                    <div className="pipe-stage" key={st.key + i}>
                      <div className="pipe-rail">
                        <div className={`pipe-dot t-${st.tone}`} />
                        {i < visible - 1 && <div className="pipe-line" />}
                      </div>
                      <div className="pipe-body">
                        <div className="pipe-label">{st.label}</div>
                        <div className="pipe-detail">{st.detail}</div>
                        {st.items && (
                          <div className="rule-list">
                            {st.items.map((it, k) => (
                              <div key={k} className={`rule-item ${it.decided ? "decided" : ""}`}>
                                <DecisionChip d={it.effect} small />
                                <div style={{ minWidth: 0 }}>
                                  <div className="rule-text">“{it.text}”</div>
                                  <div className="rule-source">
                                    {it.source}
                                    {it.decided && <span className="rule-decided"> · this rule decided</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {finished && liveEvent && (
                <div className="card" style={{ marginTop: 12 }}>
                  <div className="spread">
                    <div className="row">
                      <DecisionChip d={liveEvent.decision} />
                      <span className="small dim">{names(liveEvent).agent} · {liveEvent.plane}</span>
                    </div>
                    <div className="row">
                      <button className="btn btn-sm" onClick={() => setOpenDetail(true)}>Evidence <ArrowRight size={13} /></button>
                      {liveEvent.reviewState?.status === "pending" && (
                        <button className="btn btn-warn btn-sm" onClick={() => nav("reviews")}>Open review</button>
                      )}
                    </div>
                  </div>
                  <div className="small faint" style={{ marginTop: 8 }}>
                    This event is now visible in Control Room, Live Actions, Agent Inventory{liveEvent.transformation?.length ? ", Token Vault" : ""} and Evidence.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {openDetail && liveEvent && (
        <EventDetail e={liveEvent} onClose={() => setOpenDetail(false)} onNavigate={(r) => { setOpenDetail(false); nav(r); }} />
      )}
    </div>
  );
}
