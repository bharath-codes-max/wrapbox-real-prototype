// Policy Simulator / Shadow Mode — "if this policy had been active during
// these simulated events…" Current vs proposed, per-scenario outcome deltas.
import { useMemo, useState } from "react";
import { useAppState, shadowEvaluate } from "../state/store";
import { PageHead, DecisionChip, Chip, SimNote } from "../ui/kit";
import { SCENARIOS } from "../engine/scenarios";
import type { Decision, IntentContract } from "../model/types";

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

  return (
    <div className="page">
      <PageHead
        title="Policy Simulator"
        sub="Shadow Mode: see exactly what a policy change would have done across the scenario corpus before activating anything. No enforcement changes until a human activates the proposal."
        right={<SimNote>Evaluations run through the live Core Brain — nothing is recorded</SimNote>}
      />

      <div className="card">
        <div className="card-title">Proposed change — remove clauses from the active policy set</div>
        <div className="grid g2">
          {s.contracts.filter((c) => c.status === "ACTIVE").map((c) => (
            <div key={c.id}>
              <b className="small">{c.name}</b>
              {c.clauses.map((cl) => (
                <label key={cl.id} className="row small" style={{ padding: "3px 0", cursor: "pointer", flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={!disabled.has(cl.id)} onChange={() => toggle(cl.id)} style={{ marginTop: 2 }} />
                  <span className={disabled.has(cl.id) ? "faint" : "dim"} style={disabled.has(cl.id) ? { textDecoration: "line-through" } : undefined}>
                    {cl.text} <DecisionChip d={cl.effect} small />
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="card-title">CURRENT POLICY <span className="faint small">— outcome across {rows.length} scenarios</span></div>
          <div className="row">
            {(["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[]).map((d) => (
              <div key={d} className="row" style={{ gap: 5 }}><DecisionChip d={d} small /><b className="mono">{count("current", d)}</b></div>
            ))}
          </div>
        </div>
        <div className="card" style={{ borderColor: changed.length ? "var(--warn)" : "var(--border)" }}>
          <div className="card-title">PROPOSED POLICY <span className="faint small">— {changed.length} outcome(s) would change</span></div>
          <div className="row">
            {(["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[]).map((d) => (
              <div key={d} className="row" style={{ gap: 5 }}><DecisionChip d={d} small /><b className="mono">{count("prop", d)}</b></div>
            ))}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Per-scenario impact</h2>
      <div className="card" style={{ padding: 0 }}>
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
      {changed.some((r) => r.prop === "ALLOW" && (r.current === "BLOCK" || r.current === "CONSTRAIN")) && (
        <div className="card" style={{ marginTop: 10, borderColor: "var(--bad)" }}>
          <b className="small" style={{ color: "var(--bad)" }}>Rollout warning:</b>{" "}
          <span className="small dim">
            the proposal converts protective outcomes to plain ALLOW. Note that Safety Kernel invariants still apply —
            credential exfiltration remains blocked even with all clauses removed. Review in <a onClick={() => nav("safety")}>Safety Kernel</a>.
          </span>
        </div>
      )}
    </div>
  );
}
