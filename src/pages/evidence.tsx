// Evidence Explorer — searchable, tamper-evident event evidence with the
// full causal chain and a graph/timeline view.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, DecisionChip, Chip, SimNote, names, EvidenceChain, RiskChip } from "../ui/kit";
import { EventDetail } from "../ui/event-detail";
import type { SimulationEvent } from "../model/types";

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

  return (
    <div className="page">
      <PageHead
        title="Evidence Explorer"
        sub="Every consequential decision leaves signed, chained evidence: who, which agent, which tool, what action, what data, which policy, what decision, what actually happened."
        right={<SimNote>Hash chain simulated — evidence model real</SimNote>}
      />
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" style={{ maxWidth: 340 }} placeholder="Search id, action, data class, policy, safety rule…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="row" style={{ gap: 0 }}>
          <button className={`btn btn-sm ${view === "table" ? "btn-primary" : ""}`} style={{ borderRadius: "6px 0 0 6px" }} onClick={() => setView("table")}>Table</button>
          <button className={`btn btn-sm ${view === "graph" ? "btn-primary" : ""}`} style={{ borderRadius: "0 6px 6px 0" }} onClick={() => setView("graph")}>Causal graph</button>
        </div>
        <span className="small faint">{list.length} of {s.events.length} events · chain head {s.lastHash}</span>
      </div>

      {view === "table" ? (
        <div className="card" style={{ padding: 0 }}>
          <table className="tbl">
            <thead><tr><th>Event</th><th>Chain</th><th>Actor</th><th>Action → Resource</th><th>Data</th><th>Decision</th><th>Risk</th></tr></thead>
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
                    <td><RiskChip r={e.risk} /></td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={7}><div className="empty">No evidence matches.</div></td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid g2">
          {list.slice(0, 8).map((e) => (
            <div key={e.id} className="card rowlink" onClick={() => setOpen(e)} style={{ cursor: "pointer" }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <span className="mono small">{e.id}</span>
                <DecisionChip d={e.decision} small />
              </div>
              <EvidenceChain e={e} />
            </div>
          ))}
          {list.length === 0 && <div className="card empty">No evidence matches.</div>}
        </div>
      )}

      {open && <EventDetail e={s.events.find((x) => x.id === open.id) ?? open} onClose={() => setOpen(null)} onNavigate={(r) => { setOpen(null); nav(r); }} />}
    </div>
  );
}
