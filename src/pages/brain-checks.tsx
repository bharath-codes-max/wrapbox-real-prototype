// Core Brain → The checks (live prototype). Follows your runs: the latest five, the
// path the picked run took through the 14 checks, and under every check the runs it
// decided. Everything is read off recorded events; "Run one" records a real run.
import { useMemo, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { useAppState, scenariosByCheck, simulate } from "../state/store";
import { Avatar, AgentMark, DecisionChip, SectionHead, timeAgo } from "../ui/kit";
import { describe } from "../ui/describe";
import { EventDetail } from "../ui/event-detail";
import { checkTrace, type CheckState } from "../engine/trace";
import type { DecidedBy, SimulationEvent } from "../model/types";

export interface CheckDef { layer: DecidedBy["layer"]; name: string; asks: string; page?: [string, string] }

const STATE_LABEL: Record<CheckState, string> = { decided: "Gave the answer", noted: "Had something to say", clear: "Nothing to object" };

/** What to do first when no scenario reaches a check in the current workspace. */
const SETUP: Partial<Record<DecidedBy["layer"], string>> = {
  killswitch: "First stop an agent in Agent Inventory. Then run any action of that agent.",
  uninspectable: "First publish your rules in Intent Studio. Then send a file Wrapbox cannot open.",
  contract: "First publish a rule in Intent Studio. Then run an action that rule covers.",
  context: "In this workspace your own rules answer production actions first. With no rule for it, this check answers.",
  injection: "First run an action where the agent reads outside content. Its next risky action stops here.",
  envelope: "First start a task in Tasks. The task's steps are checked here.",
  standing: "First grant a card in Standing Permissions. Then run an action outside that card.",
  breakglass: "First turn on an emergency override in Break Glass. Then run an action on that system.",
};

const tone = (e: SimulationEvent) => `t-${e.decision.toLowerCase()}`;

export function BrainChecks({ order, nav }: { order: CheckDef[]; nav: (r: string) => void }) {
  const s = useAppState();
  const [pinned, setPinned] = useState<string | null>(null);
  const [open, setOpen] = useState<SimulationEvent | null>(null);

  const byTime = useMemo(() => [...s.events].sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id)), [s.events]);
  const latest = byTime.slice(0, 5);
  const picked = byTime.find((e) => e.id === pinned) ?? byTime[0];
  const trace = useMemo(() => (picked ? checkTrace(picked, s.standing) : []), [picked, s.standing]);
  const runnable = useMemo(() => scenariosByCheck(), [s.contracts, s.kernel, s.standing, s.stops, s.taints, s.breakGlass]);
  const stepOf = (l?: string) => order.findIndex((o) => o.layer === (l ?? "default")) + 1;
  const lit = order.filter((o) => byTime.some((e) => (e.decidedBy?.layer ?? "default") === o.layer)).length;

  return (
    <div className="chk">
      <SectionHead
        title="The checks, in order"
        sub="Wrapbox asks these 14 checks for every action. One of them gives the answer. Pick a run to see what each check found."
        right={<span className="chk-lit"><b>{lit}</b> of {order.length} checks have decided a run here</span>}
      />

      <div className="chk-runs">
        <div className="chk-runs-head">
          <span className="chk-runs-title">Your latest 5 runs</span>
          <span className="chk-runs-sub">{byTime.length} recorded · newest first</span>
        </div>
        {latest.length === 0 && (
          <div className="chk-empty">
            No runs yet, so every check shows 0. Press <b>Run one</b> on any check below, or run an action in the Simulation Lab.
            <button className="btn btn-sm" onClick={() => nav("simlab")}>Open Simulation Lab <ArrowRight size={12} /></button>
          </div>
        )}
        {latest.map((e, i) => (
          <button key={e.id} className={`chk-run ${tone(e)} ${picked?.id === e.id ? "on" : ""}`} onClick={() => setPinned(e.id)}>
            <span className="chk-run-n">{i + 1}</span>
            <Avatar userId={e.user} size={22} />
            <AgentMark agentId={e.agent} size={16} />
            <span className="chk-run-text">{describe(e)}</span>
            {i === 0 && <span className="chk-new">Latest</span>}
            <span className="chk-run-by">Step {stepOf(e.decidedBy?.layer)} · {order[stepOf(e.decidedBy?.layer) - 1]?.name}</span>
            <DecisionChip d={e.decision} small />
            <span className="chk-run-time">{timeAgo(e.timestamp)}</span>
          </button>
        ))}
      </div>

      {picked && (
        <div className={`chk-path ${tone(picked)}`}>
          <div className="chk-path-top">
            <div style={{ minWidth: 0 }}>
              <div className="chk-path-eyebrow">{picked.id === byTime[0].id ? "Path of your latest run" : "Path of the run you picked"} · {picked.id}</div>
              <div className="chk-path-title">{describe(picked)}</div>
            </div>
            <DecisionChip d={picked.decision} />
            <button className="btn btn-sm" onClick={() => setOpen(picked)}>Open the full record <ArrowRight size={12} /></button>
          </div>
          <div className="chk-rail">
            {trace.map((t, i) => (
              <a key={t.layer} href={`#chk-${t.layer}`} className={`chk-dot s-${t.state}`} title={`${order[i].name}: ${t.note}`}
                onClick={(ev) => { ev.preventDefault(); document.getElementById(`chk-${t.layer}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                <span className="chk-dot-n">{i + 1}</span>
                <span className="chk-dot-name">{order[i].name}</span>
              </a>
            ))}
          </div>
          <div className="chk-key">
            <span><i className="chk-key-dot s-decided" /> gave the answer</span>
            <span><i className="chk-key-dot s-noted" /> had something to say</span>
            <span><i className="chk-key-dot s-clear" /> nothing to object</span>
          </div>
        </div>
      )}

      <div className="chk-grid">
        {order.map((o, i) => {
          const mine = byTime.filter((e) => (e.decidedBy?.layer ?? "default") === o.layer);
          const t = trace[i];
          const sc = runnable[o.layer];
          return (
            <div key={o.layer} id={`chk-${o.layer}`} className={`chk-card ${t ? `s-${t.state}` : ""} ${picked && t?.state === "decided" ? tone(picked) : ""}`}>
              <div className="chk-card-head">
                <span className="chk-card-n">{i + 1}</span>
                <span className="chk-card-name">{o.name}</span>
                <span className={`chk-count ${mine.length ? "has" : ""}`} title="How many recorded runs this check answered">Decided {mine.length}</span>
              </div>
              <div className="chk-asks">{o.asks}</div>

              {t && (
                <div className="chk-now">
                  <div className="chk-label">In the picked run</div>
                  <div className="chk-now-state">{STATE_LABEL[t.state]}</div>
                  <div className="chk-now-note">{t.note}</div>
                </div>
              )}

              <div className="chk-mine">
                <div className="chk-label">Latest runs it decided</div>
                {mine.length === 0 && <div className="chk-none">None yet.</div>}
                {mine.slice(0, 3).map((e) => (
                  <button key={e.id} className={`chk-mini ${tone(e)} ${picked?.id === e.id ? "on" : ""}`} onClick={() => setPinned(e.id)}>
                    <span className="chk-mini-text">{describe(e)}</span>
                    {e.id === byTime[0].id && <span className="chk-new">Latest</span>}
                    <span className="chk-mini-time">{timeAgo(e.timestamp)}</span>
                  </button>
                ))}
                {mine.length > 3 && <div className="chk-none">and {mine.length - 3} more in Evidence.</div>}
              </div>

              <div className="chk-foot">
                {sc ? (
                  <button className="btn btn-sm" title={sc.narrative} onClick={() => { simulate(sc); setPinned(null); }}>
                    <Play size={11} /> Run one: {sc.title}
                  </button>
                ) : (
                  <div className="chk-setup">{SETUP[o.layer] ?? "No scenario reaches this check right now."}</div>
                )}
                {o.page && <button className="btn btn-sm btn-ghost" onClick={() => nav(o.page![0])}>{o.page[1]} <ArrowRight size={12} /></button>}
              </div>
            </div>
          );
        })}
      </div>
      {open && <EventDetail e={open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
