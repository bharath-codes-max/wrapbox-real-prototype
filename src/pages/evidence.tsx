// Evidence Explorer — searchable, tamper-evident event evidence with the
// full causal chain and a graph/timeline view.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, SectionHead, Stat, DecisionChip, Chip, SimNote, names, EvidenceChain, RiskChip } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import type { SimulationEvent } from "../model/types";
import { userById } from "../model/org";

// The human's answer to a REVIEW, kept separate from Wrapbox's own decision.
const REVIEW_OUTCOME: Record<string, [string, string]> = {
  pending: ["review", "Waiting"],
  approved: ["allow", "Approved"],
  approved_scoped: ["allow", "Approved (scoped)"],
  constrained: ["constrain", "Constrained"],
  denied: ["block", "Denied"],
  expired: ["neutral", "Expired"],
};

function HumanReview({ e }: { e: SimulationEvent }) {
  const r = e.reviewState;
  if (!r) return <span className="faint">—</span>;
  const [tone, label] = REVIEW_OUTCOME[r.status] ?? ["neutral", r.status];
  return (
    <div>
      <Chip tone={tone}>{label}</Chip>
      {r.reviewer && <div className="small faint" style={{ marginTop: 4 }}>by {userById(r.reviewer)?.name ?? r.reviewer}</div>}
    </div>
  );
}
import { FileClock, Ban, Hand, KeyRound, Table2, GitBranch, Search } from "lucide-react";

export function EvidenceExplorer({ nav }: { nav: (r: string) => void; route: string }) {
  const s = useAppState();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "graph">("table");
  const [open, setOpen] = useState<SimulationEvent | null>(null);

  const list = useMemo(() => {
    let l = [...s.events].sort((a, b) => b.timestamp - a.timestamp);
    if (q) {
      const t = q.toLowerCase();
      l = l.filter((e) =>
        [e.id, e.action, e.actionRaw, e.resource, e.decision, ...(e.dataClasses),
         ...e.matchedContracts.map((m) => m.clauseText), ...e.safetyRules.map((r) => r.name)]
          .join(" ").toLowerCase().includes(t)
      );
    }
    return l;
  }, [s.events, q]);

  const tally = useMemo(() => ({
    total: s.events.length,
    blocked: s.events.filter((e) => e.decision === "BLOCK").length,
    reviewed: s.events.filter((e) => e.decision === "REVIEW").length,
    breakGlass: s.events.filter((e) => e.breakGlass).length,
  }), [s.events]);

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Visibility"
        title="Evidence Explorer"
        sub="Every consequential decision leaves signed, chained evidence: who, which agent, which tool, what action, what data, which policy, what decision, what actually happened."
        right={<SimNote>Hash chain simulated — evidence model real</SimNote>}
      />

      <div className="grid g4">
        <Stat icon={<FileClock size={17} />} label="Chained events" value={tally.total} note={`chain head ${s.lastHash}`} />
        <Stat icon={<Ban size={17} />} label="Blocked" value={tally.blocked} tone={tally.blocked > 0 ? "bad" : "good"} note="stopped before execution" />
        <Stat icon={<Hand size={17} />} label="Reviewed" value={tally.reviewed} tone={tally.reviewed > 0 ? "warn" : "good"} note="escalated to a human" />
        <Stat icon={<KeyRound size={17} />} label="Break-glass" value={tally.breakGlass} tone={tally.breakGlass > 0 ? "bad" : "good"} note="emergency overrides logged" />
      </div>

      <div className="section">
        <SectionHead
          title="Evidence ledger"
          sub={`${list.length} of ${s.events.length} events${q ? " matching your search" : ""}, newest first`}
          right={
            <div className="row" style={{ gap: 0 }}>
              <button className={`btn btn-sm ${view === "table" ? "btn-primary" : ""}`} style={{ borderRadius: "8px 0 0 8px" }} onClick={() => setView("table")}><Table2 size={13} /> Table</button>
              <button className={`btn btn-sm ${view === "graph" ? "btn-primary" : ""}`} style={{ borderRadius: "0 8px 8px 0" }} onClick={() => setView("graph")}><GitBranch size={13} /> Causal graph</button>
            </div>
          }
        />

        <div className="row" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 8, flex: 1, maxWidth: 380 }}>
            <Search size={15} className="faint" />
            <input className="input" style={{ flex: 1 }} placeholder="Search id, action, data class, policy, safety rule…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {view === "table" ? (
          <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Event</th><th>Chain</th><th>Actor</th><th>Action → Resource</th><th>Data</th><th>Wrapbox decision</th><th>Human review</th><th>Risk</th></tr></thead>
              <tbody>
                {list.map((e) => {
                  const n = names(e);
                  return (
                    <tr key={e.id} className="rowlink" onClick={() => setOpen(e)}>
                      <td className="mono small">{e.id}<div className="faint">{new Date(e.timestamp).toLocaleTimeString()}</div></td>
                      <td className="mono small faint">{e.evidence.hash}<div>← {e.evidence.prevHash}</div></td>
                      <td className="small">{n.user}<div className="faint">{n.agent}{e.application ? ` · ${e.application}` : ""}</div></td>
                      <td className="small"><span className="mono">{e.actionRaw ?? e.action}</span><div className="faint">{n.resource}{n.destination ? ` → ${n.destination}` : ""}</div></td>
                      <td>{e.dataClasses.slice(0, 2).map((c) => <div key={c}><Chip tone="violet">{c}</Chip></div>)}{e.dataClasses.length > 2 && <span className="faint small">+{e.dataClasses.length - 2}</span>}</td>
                      <td><DecisionChip d={e.decision} small />{e.breakGlass && <div><Chip tone="critical">BREAK-GLASS</Chip></div>}</td>
                      <td><HumanReview e={e} /></td>
                      <td><RiskChip r={e.risk} /></td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={8}><div className="empty">No evidence matches your search.</div></td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid g2">
            {list.slice(0, 8).map((e) => (
              <div key={e.id} className="card rowlink" onClick={() => setOpen(e)} style={{ cursor: "pointer" }}>
                <div className="spread" style={{ marginBottom: 12 }}>
                  <span className="mono small">{e.id}</span>
                  <DecisionChip d={e.decision} small />
                </div>
                <EvidenceChain e={e} />
              </div>
            ))}
            {list.length === 0 && <div className="card empty">No evidence matches your search.</div>}
          </div>
        )}
      </div>

      {open && <EventDetail e={s.events.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
