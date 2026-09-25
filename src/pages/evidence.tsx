// Evidence Explorer — searchable, tamper-evident event evidence with the
// full causal chain and a graph/timeline view.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, SectionHead, MetricBar, DecisionChip, Chip, SimNote, names, EvidenceChain, RiskChip, Avatar, AgentMark, DestMark, usePaged, Pager } from "../ui/kit";
import { describe } from "../ui/describe";
import { EventDetail } from "../ui/event-detail";
import type { SimulationEvent } from "../model/types";
import { userById } from "../model/org";
import { FileClock, Table2, GitBranch, Search } from "lucide-react";

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
        [e.id, describe(e), e.action, e.actionRaw, e.resource, e.decision, ...(e.dataClasses),
         ...e.matchedContracts.map((m) => m.clauseText), ...e.safetyRules.map((r) => r.name)]
          .join(" ").toLowerCase().includes(t)
      );
    }
    return l;
  }, [s.events, q]);

  // Table view shows 15 events per page; a new search jumps back to page 1.
  const paged = usePaged(list, 10, q);

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

      {/* Ledger integrity hero — the tamper-evident chain, with the key counts woven in */}
      <div className="card overview-card">
        <div className="spread" style={{ alignItems: "flex-start", gap: 20 }}>
          <div className="row" style={{ gap: 12, minWidth: 0 }}>
            <span className="stat-icon" style={{ color: "var(--accent)", background: "var(--accent-soft)", flexShrink: 0 }}><FileClock size={17} /></span>
            <div style={{ minWidth: 0 }}>
              <div className="section-title">Tamper-evident ledger</div>
              <div className="section-sub">Every record is hash-linked to the one before it — altering any entry breaks the chain and shows up on inspection.</div>
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="eyebrow">Chain head</div>
            <div className="mono small" style={{ marginTop: 5, color: "var(--fg-2)" }}>{s.lastHash}</div>
          </div>
        </div>
        <div className="overview-sep" />
        <MetricBar band items={[
          { label: "Chained events", value: tally.total, note: "sealed & hash-linked" },
          { label: "Blocked", value: tally.blocked, tone: tally.blocked > 0 ? "bad" : "good", note: "stopped before execution" },
          { label: "Reviewed", value: tally.reviewed, tone: tally.reviewed > 0 ? "warn" : "good", note: "escalated to a human" },
          { label: "Break-glass", value: tally.breakGlass, tone: tally.breakGlass > 0 ? "bad" : "good", note: "emergency overrides logged" },
        ]} />
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
          <div className="row" style={{ gap: 8, flex: 1, maxWidth: 420 }}>
            <Search size={15} className="faint" />
            <input className="input" style={{ flex: 1 }} placeholder="Search id, action, data class, policy, safety rule…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {view === "table" ? (
          <div className="card card-pad-0">
            <table className="tbl tbl-wide">
              <thead><tr><th>Time</th><th>Actor</th><th>What happened</th><th>Data</th><th>Wrapbox decision</th><th>Human review</th><th>Risk</th><th>Seal</th></tr></thead>
              <tbody>
                {paged.rows.map((e) => {
                  const n = names(e);
                  return (
                    <tr key={e.id} className="rowlink" onClick={() => setOpen(e)}>
                      <td className="mono small">{new Date(e.timestamp).toLocaleTimeString()}<div className="faint" style={{ fontSize: 11, marginTop: 2 }}>{e.id}</div></td>
                      <td className="small">
                        <div className="row" style={{ gap: 7 }}>
                          <Avatar userId={e.user} size={20} />
                          <span style={{ fontWeight: 550 }}>{n.user}</span>
                        </div>
                        <div className="row faint" style={{ gap: 6, marginTop: 5 }}>
                          <AgentMark agentId={e.agent} size={13} />
                          <span>{n.agent}{e.application ? ` · ${e.application}` : ""}</span>
                        </div>
                      </td>
                      <td>
                        <div className="small" style={{ fontWeight: 550, display: "flex", gap: 6, alignItems: "flex-start" }}>
                          {e.destination && <span style={{ marginTop: 1, flexShrink: 0 }}><DestMark destId={e.destination} size={14} /></span>}
                          <span>{describe(e)}</span>
                        </div>
                        <div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>{e.actionRaw ?? e.action}</div>
                      </td>
                      <td>
                        {e.dataClasses.slice(0, 2).map((c) => <div key={c} style={{ marginBottom: 3 }}><Chip tone="violet">{c}</Chip></div>)}
                        {e.dataClasses.length > 2 && <span className="faint small">+{e.dataClasses.length - 2}</span>}
                        {e.dataClasses.length === 0 && <span className="faint">—</span>}
                      </td>
                      <td><DecisionChip d={e.decision} small />{e.breakGlass && <div style={{ marginTop: 5 }}><Chip tone="critical">BREAK-GLASS</Chip></div>}</td>
                      <td><HumanReview e={e} /></td>
                      <td><RiskChip r={e.risk} /></td>
                      <td className="mono small faint">{e.evidence.hash}<div style={{ marginTop: 2 }}>← {e.evidence.prevHash}</div></td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={8}><div className="empty">No evidence matches your search.</div></td></tr>}
              </tbody>
            </table>
            <Pager {...paged} />
          </div>
        ) : (
          <div className="grid g2">
            {list.slice(0, 8).map((e) => {
              const n = names(e);
              return (
                <div key={e.id} className="card rowlink" onClick={() => setOpen(e)} style={{ cursor: "pointer" }}>
                  <div className="spread" style={{ marginBottom: 14, alignItems: "flex-start", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 7 }}>
                        <Avatar userId={e.user} size={20} />
                        <AgentMark agentId={e.agent} size={14} />
                        <span className="small" style={{ fontWeight: 550 }}>{n.user}</span>
                      </div>
                      <div className="small dim" style={{ marginTop: 7 }}>{describe(e)}</div>
                      <div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>{e.id} · {new Date(e.timestamp).toLocaleTimeString()}</div>
                    </div>
                    <DecisionChip d={e.decision} small />
                  </div>
                  <EvidenceChain e={e} />
                </div>
              );
            })}
            {list.length === 0 && <div className="card empty">No evidence matches your search.</div>}
          </div>
        )}
      </div>

      {open && <EventDetail e={s.events.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
