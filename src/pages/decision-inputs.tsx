// Core Brain → Decision inputs (live prototype). Pick any recorded action and see
// the 15 facts the engine weighed for it, with the real value of each, which one
// the deciding gate read, and the decision that came out. Every value is read off
// the event by engine/inputs.ts; nothing on this screen is typed in.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, CirclePlay, FileSearch } from "lucide-react";
import type { AppState } from "../state/store";
import type { Decision, SimulationEvent } from "../model/types";
import { decisionInputs, inputPresence, INPUT_GROUPS } from "../engine/inputs";
import { agentById, userById } from "../model/org";
import { Avatar, AgentMark, DecisionChip, RiskChip, timeAgo } from "../ui/kit";
import { describe } from "../ui/describe";
import { EventDetail } from "../ui/event-detail";

const FILTERS: (Decision | "ALL")[] = ["ALL", "BLOCK", "REVIEW", "CONSTRAIN", "ALLOW"];
const word = (d: string) => d.charAt(0) + d.slice(1).toLowerCase();

export function DecisionInputs({ s, nav }: { s: AppState; nav: (r: string) => void }) {
  const events = useMemo(() => [...s.events].sort((a, b) => b.timestamp - a.timestamp), [s.events]);
  const [filter, setFilter] = useState<Decision | "ALL">("ALL");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [open, setOpen] = useState<SimulationEvent | null>(null);
  const shown = filter === "ALL" ? events : events.filter((e) => e.decision === filter);
  const picked = shown.find((e) => e.id === pickedId) ?? shown[0] ?? null;
  const rows = useMemo(() => (picked ? decisionInputs(picked, s.standing) : []), [picked, s.standing]);
  const presence = useMemo(() => inputPresence(s.events, s.standing), [s.events, s.standing]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: events.length };
    for (const e of events) c[e.decision] = (c[e.decision] ?? 0) + 1;
    return c;
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="card empty">
        <FileSearch size={26} className="dim" />
        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No actions recorded yet</div>
        <div className="small dim" style={{ maxWidth: 460, margin: "6px auto 0", lineHeight: 1.55 }}>
          Run one scenario and this page fills in: the 15 facts Wrapbox weighed for it, and the decision that came out.
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={() => nav("simlab")}><CirclePlay size={13} /> Open Simulation Lab</button>
      </div>
    );
  }

  const present = rows.filter((r) => r.present).length;
  const tone = picked ? picked.decision.toLowerCase() : "allow";

  return (
    <div className="din">
      <aside className="din-list" aria-label="Recorded actions">
        <div className="din-list-head">
          <span className="din-list-title">Pick an action</span>
          <span className="small faint">{shown.length} of {events.length}</span>
        </div>
        <div className="din-filters" role="tablist" aria-label="Decision">
          {FILTERS.filter((f) => f === "ALL" || counts[f]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={`din-filter${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
              {f === "ALL" ? "All" : word(f)} <span>{counts[f] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="din-items">
          {shown.map((e) => (
            <button key={e.id} type="button" className={`din-item t-${e.decision.toLowerCase()}${picked?.id === e.id ? " on" : ""}`} onClick={() => setPickedId(e.id)}>
              <span className="din-item-top"><DecisionChip d={e.decision} small /><span className="din-item-time">{timeAgo(e.timestamp)}</span></span>
              <span className="din-item-text">{describe(e)}</span>
              <span className="din-item-meta"><Avatar userId={e.user} size={14} />{userById(e.user)?.name ?? e.user} · {agentById(e.agent)?.name ?? e.agent}</span>
            </button>
          ))}
        </div>
      </aside>

      {picked && (
        <section className={`din-sheet t-${tone}`}>
          <header className="din-head">
            <span className="din-head-mark"><AgentMark agentId={picked.agent} size={22} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="din-head-title">{describe(picked)}</div>
              <div className="din-head-meta">
                <span className="mono">{picked.id}</span><span>·</span><span>{timeAgo(picked.timestamp)}</span><span>·</span>
                <span><b>{present}</b> of 15 inputs present</span>
              </div>
            </div>
            <span className="row" style={{ gap: 6, flexShrink: 0 }}><RiskChip r={picked.risk} /><DecisionChip d={picked.decision} /></span>
          </header>

          {INPUT_GROUPS.map((g) => (
            <div key={g.id} className="din-group">
              <div className="din-group-title">{g.title}</div>
              <div className="din-grid">
                {rows.filter((r) => r.group === g.id).map((r) => {
                  const idx = rows.indexOf(r) + 1;
                  return (
                    <div key={r.key} className={`din-cell${r.present ? "" : " absent"}${r.decided ? " decided" : ""}`}>
                      <div className="din-cell-top">
                        <span className="din-cell-n">{String(idx).padStart(2, "0")}</span>
                        <span className="din-cell-label">{r.label}</span>
                        {r.decided
                          ? <span className="din-cell-tag">decided here</span>
                          : <span className="din-cell-seen" title="How many recorded actions carry this input">in {presence[r.key] ?? 0} of {events.length}</span>}
                      </div>
                      <div className="din-cell-value">{r.value}</div>
                      {r.code && <pre className="din-cell-code">{r.code}</pre>}
                      {r.detail.map((d) => <div key={d} className="din-cell-detail">{d}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="din-arrow" aria-hidden="true"><ArrowDown size={16} /></div>

          <div className="din-out">
            <div className="din-out-top">
              <span className="din-out-label">Decision</span>
              <DecisionChip d={picked.decision} />
              <span className="din-out-by">{picked.decidedBy?.label ?? "No rule restricts this action"}</span>
            </div>
            <ul className="din-out-reasons">
              {picked.decisionReasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
            {picked.safeAlternative && <div className="din-out-alt"><b>Safer option:</b> {picked.safeAlternative}</div>}
            <button className="btn btn-sm" onClick={() => setOpen(picked)}>Open the full record <ArrowRight size={13} /></button>
          </div>
        </section>
      )}
      {open && <EventDetail e={open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
