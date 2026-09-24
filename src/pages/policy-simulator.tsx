// Policy Simulator / Shadow Mode — "if this policy had been active during
// these simulated events…" Current vs proposed, per-scenario outcome deltas.
import { useMemo, useState } from "react";
import { useAppState, shadowEvaluate } from "../state/store";
import { PageHead, SectionHead, Stat, DecisionChip, Chip, SimNote } from "../ui/kit";
import { SCENARIOS } from "../engine/scenarios";
import type { Decision, IntentContract } from "../model/types";
import { FlaskConical, Scissors, GitCompare, ShieldAlert, ArrowRight } from "lucide-react";

export function PolicySimulator({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [disabled, setDisabled] = useState<Set<string>>(new Set()); // clause ids removed in proposal
  const toggle = (id: string) => {
    const n = new Set(disabled);
    n.has(id) ? n.delete(id) : n.add(id);
    setDisabled(n);
  };

  const proposed: IntentContract[] = useMemo(
    () =>
      s.contracts.map((c) => ({
        ...c,
        clauses: c.clauses.filter((cl) => !disabled.has(cl.id)),
      })),
    [s.contracts, disabled]
  );

  const rows = useMemo(
    () =>
      SCENARIOS.map((sc) => ({
        sc,
        current: shadowEvaluate(sc, s.contracts),
        prop: shadowEvaluate(sc, proposed),
      })),
    [s.contracts, proposed]
  );

  const count = (which: "current" | "prop", d: Decision) => rows.filter((r) => r[which] === d).length;
  const changed = rows.filter((r) => r.current !== r.prop);
  const activeContracts = s.contracts.filter((c) => c.status === "ACTIVE");

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Policy"
        title="Policy Simulator"
        sub="Shadow Mode: see exactly what a policy change would have done across the scenario corpus before activating anything. No enforcement changes until a human activates the proposal."
        right={<SimNote>Evaluations run through the live Core Brain — nothing is recorded</SimNote>}
      />

      <div className="grid g3">
        <Stat icon={<FlaskConical size={17} />} label="Scenarios evaluated" value={rows.length} note="run through the live Core Brain" />
        <Stat icon={<Scissors size={17} />} label="Clauses removed" value={disabled.size} tone={disabled.size ? "info" : undefined} note={disabled.size ? "in the proposed policy set" : "proposal matches current policy"} />
        <Stat icon={<GitCompare size={17} />} label="Outcomes changed" value={changed.length} tone={changed.length ? "warn" : "good"} note={changed.length ? "differ from the current policy" : "no drift from current policy"} />
      </div>

      <div className="section">
        <SectionHead title="Proposed change" sub="Uncheck clauses to remove them from the active policy set — enforcement is unaffected until a human activates the proposal." />
        {activeContracts.length ? (
          <div className="grid g2">
            {activeContracts.map((c) => (
              <div className="card" key={c.id}>
                <div className="row spread" style={{ marginBottom: 8 }}>
                  <b className="small">{c.name}</b>
                  <Chip tone="neutral">{c.clauses.length} clause{c.clauses.length === 1 ? "" : "s"}</Chip>
                </div>
                {c.clauses.map((cl) => (
                  <label key={cl.id} className="row small" style={{ padding: "4px 0", cursor: "pointer", flexWrap: "nowrap", alignItems: "flex-start" }}>
                    <input type="checkbox" checked={!disabled.has(cl.id)} onChange={() => toggle(cl.id)} style={{ marginTop: 2 }} />
                    <span className={disabled.has(cl.id) ? "faint" : "dim"} style={disabled.has(cl.id) ? { textDecoration: "line-through" } : undefined}>
                      {cl.text} <DecisionChip d={cl.effect} small />
                    </span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No active policy contracts to modify.</div>
        )}
      </div>

      <div className="section">
        <SectionHead title="Outcome comparison" sub={`How the ${rows.length} corpus scenarios resolve under each policy set`} />
        <div className="grid g2">
          <div className="card">
            <div className="row spread" style={{ marginBottom: 12 }}>
              <b className="small">Current policy</b>
              <span className="faint small">active enforcement</span>
            </div>
            <div className="row">
              {(["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[]).map((d) => (
                <div key={d} className="row" style={{ gap: 5 }}><DecisionChip d={d} small /><b className="mono">{count("current", d)}</b></div>
              ))}
            </div>
          </div>
          <div className="card" style={{ borderColor: changed.length ? "var(--warn)" : "var(--border)" }}>
            <div className="row spread" style={{ marginBottom: 12 }}>
              <b className="small">Proposed policy</b>
              <Chip tone={changed.length ? "review" : "allow"}>{changed.length} outcome{changed.length === 1 ? "" : "s"} would change</Chip>
            </div>
            <div className="row">
              {(["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[]).map((d) => (
                <div key={d} className="row" style={{ gap: 5 }}><DecisionChip d={d} small /><b className="mono">{count("prop", d)}</b></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Per-scenario impact" sub="Every scenario in the corpus, current outcome versus proposed. Changed rows are highlighted." />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Scenario</th><th>Plane</th><th>Current</th><th></th><th>Proposed</th></tr></thead>
            <tbody>
              {rows.map(({ sc, current, prop }) => (
                <tr key={sc.id} style={current !== prop ? { background: "var(--warn-soft)" } : undefined}>
                  <td><b className="small">{sc.title}</b><div className="small faint">{sc.narrative}</div></td>
                  <td><Chip tone="neutral">{sc.plane}</Chip></td>
                  <td><DecisionChip d={current} small /></td>
                  <td className="faint">{current !== prop ? "→" : "="}</td>
                  <td><DecisionChip d={prop} small /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {changed.some((r) => r.prop === "ALLOW" && (r.current === "BLOCK" || r.current === "CONSTRAIN")) && (
        <div className="section">
          <div className="card" style={{ borderColor: "var(--bad)" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <ShieldAlert size={18} style={{ color: "var(--bad)", flexShrink: 0, marginTop: 1 }} />
              <div>
                <b className="small" style={{ color: "var(--bad)" }}>Rollout warning</b>
                <div className="small dim" style={{ marginTop: 3, lineHeight: 1.55 }}>
                  The proposal converts protective outcomes to plain ALLOW. Note that Safety Kernel invariants still apply —
                  credential exfiltration remains blocked even with all clauses removed.{" "}
                  <a onClick={() => nav("safety")} className="row" style={{ display: "inline-flex", gap: 3, cursor: "pointer" }}>Review in Safety Kernel <ArrowRight size={13} /></a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
