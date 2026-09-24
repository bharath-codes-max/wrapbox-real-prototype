// Policy Simulator / Shadow Mode — "if this policy had been in force during
// these events, what would have happened?" Replays the company's own recorded
// history (and the scenario library) through the real Core Brain under the
// current rules and under a proposed set. A preview only: nothing is enforced
// or recorded from this page — changes become real in Intent Studio.
import { useMemo, useState } from "react";
import { useAppState, shadowEvaluate } from "../state/store";
import { PageHead, SectionHead, Stat, DecisionChip, Chip, SimNote, Avatar, timeAgo } from "../ui/kit";
import { SCENARIOS, scenarioById, type Scenario } from "../engine/scenarios";
import { canActivate } from "../engine/coverage";
import { describe } from "../ui/describe";
import { userById } from "../model/org";
import type { Decision, IntentContract, SimulationEvent } from "../model/types";
import { History, Library, GitCompare, ShieldAlert, ArrowRight, Info } from "lucide-react";

type Source = "history" | "library";

interface Row {
  key: string;
  title: string;
  sub: string;
  user?: string;
  current: Decision;
  prop: Decision;
}

export function PolicySimulator({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [source, setSource] = useState<Source>("history");
  const [removed, setRemoved] = useState<Set<string>>(new Set()); // clause ids dropped from ACTIVE contracts
  const [added, setAdded] = useState<Set<string>>(new Set()); // inactive contract ids switched on in the preview

  const flip = (set: Set<string>, id: string, apply: (n: Set<string>) => void) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    apply(n);
  };

  const active = s.contracts.filter((c) => c.status === "ACTIVE");
  const inactive = s.contracts.filter((c) => c.status !== "ACTIVE");

  // The proposed rule set: active contracts minus unticked rules, plus any
  // switched-off contracts the admin wants to try switching on.
  const proposed: IntentContract[] = useMemo(
    () =>
      s.contracts.map((c) => {
        if (c.status === "ACTIVE") return { ...c, clauses: c.clauses.filter((cl) => !removed.has(cl.id)) };
        return added.has(c.id) ? { ...c, status: "ACTIVE" as const } : c;
      }),
    [s.contracts, removed, added]
  );

  // Your own history: every recorded action that came from a known scenario.
  const history = useMemo(
    () => s.events.filter((e) => e.scenario && scenarioById(e.scenario)).sort((a, b) => b.timestamp - a.timestamp),
    [s.events]
  );

  const rows: Row[] = useMemo(() => {
    if (source === "history") {
      return history.map((e: SimulationEvent) => {
        const sc = scenarioById(e.scenario!) as Scenario;
        return {
          key: e.id,
          title: describe(e),
          sub: `${userById(e.user)?.name ?? e.user} · ${timeAgo(e.timestamp)}`,
          user: e.user,
          current: shadowEvaluate(sc, s.contracts),
          prop: shadowEvaluate(sc, proposed),
        };
      });
    }
    return SCENARIOS.map((sc) => ({
      key: sc.id,
      title: sc.title,
      sub: sc.narrative,
      current: shadowEvaluate(sc, s.contracts),
      prop: shadowEvaluate(sc, proposed),
    }));
  }, [source, history, s.contracts, s.kernel, proposed]);

  const count = (which: "current" | "prop", d: Decision) => rows.filter((r) => r[which] === d).length;
  const changed = rows.filter((r) => r.current !== r.prop);
  const weakened = changed.filter((r) => r.prop === "ALLOW" && r.current !== "ALLOW");
  const edits = removed.size + added.size;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Policy"
        title="Policy Simulator"
        sub="Try a rule change safely: see what would have happened across your company's real history before you switch anything on or off. This page is a preview — nothing is enforced or recorded here."
        right={<SimNote>Replays run through the live Core Brain — nothing is recorded</SimNote>}
      />

      <div className="grid g3">
        <Stat icon={<History size={17} />} label={source === "history" ? "Actions replayed" : "Scenarios replayed"} value={rows.length} note={source === "history" ? "your recorded history" : "scenario library"} />
        <Stat icon={<Info size={17} />} label="Rule changes" value={edits} tone={edits ? "info" : undefined} note={edits ? `${removed.size} switched off · ${added.size} switched on` : "no change proposed yet"} />
        <Stat icon={<GitCompare size={17} />} label="Outcomes that would change" value={changed.length} tone={changed.length ? "warn" : "good"} note={changed.length ? "compared with your rules today" : "same as today"} />
      </div>

      <div className="section">
        <SectionHead
          title="1 · Propose a change"
          sub="Untick a rule to try switching it off. Tick a switched-off contract to try switching it on."
        />
        <div className="grid g2">
          {active.map((c) => (
            <div className="card" key={c.id}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <b className="small">{c.name}</b>
                <Chip tone="allow">ACTIVE</Chip>
              </div>
              {c.clauses.map((cl) => (
                <label key={cl.id} className="row small" style={{ padding: "4px 0", cursor: "pointer", flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={!removed.has(cl.id)} onChange={() => flip(removed, cl.id, setRemoved)} style={{ marginTop: 2 }} />
                  <span className={removed.has(cl.id) ? "faint" : "dim"} style={removed.has(cl.id) ? { textDecoration: "line-through" } : undefined}>
                    {cl.text} <DecisionChip d={cl.effect} small />
                  </span>
                </label>
              ))}
            </div>
          ))}
          {inactive.map((c) => (
            <div className="card" key={c.id} style={added.has(c.id) ? { borderColor: "var(--accent)" } : undefined}>
              <label className="spread" style={{ cursor: "pointer", marginBottom: 8, flexWrap: "nowrap" }}>
                <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                  <input type="checkbox" checked={added.has(c.id)} onChange={() => flip(added, c.id, setAdded)} />
                  <b className="small">{c.name}</b>
                </span>
                <Chip tone={added.has(c.id) ? "constrain" : "neutral"}>{added.has(c.id) ? "ON IN PREVIEW" : c.status}</Chip>
              </label>
              {c.clauses.map((cl) => (
                <div key={cl.id} className="small faint" style={{ padding: "3px 0 3px 24px" }}>
                  {cl.text} <DecisionChip d={cl.effect} small />
                </div>
              ))}
              {!canActivate(c) && (
                <div className="small" style={{ color: "var(--warn)", marginTop: 8 }}>
                  Preview only — this contract can't really be switched on yet (a skill it needs is missing).
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <SectionHead
          title="2 · See what would happen"
          sub="Every action replayed under your rules today and under your proposal"
          right={
            <div className="row" style={{ gap: 0 }}>
              <button className={`btn btn-sm ${source === "history" ? "btn-primary" : ""}`} style={{ borderRadius: "8px 0 0 8px" }} onClick={() => setSource("history")}>
                <History size={13} /> Your history ({history.length})
              </button>
              <button className={`btn btn-sm ${source === "library" ? "btn-primary" : ""}`} style={{ borderRadius: "0 8px 8px 0" }} onClick={() => setSource("library")}>
                <Library size={13} /> Scenario library ({SCENARIOS.length})
              </button>
            </div>
          }
        />
        <div className="grid g2">
          <div className="card">
            <div className="spread" style={{ marginBottom: 12 }}>
              <b className="small">Your rules today</b>
              <span className="faint small">what Wrapbox enforces now</span>
            </div>
            <div className="row">
              {(["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[]).map((d) => (
                <div key={d} className="row" style={{ gap: 5 }}><DecisionChip d={d} small /><b className="mono">{count("current", d)}</b></div>
              ))}
            </div>
          </div>
          <div className="card" style={{ borderColor: changed.length ? "var(--warn)" : "var(--border)" }}>
            <div className="spread" style={{ marginBottom: 12 }}>
              <b className="small">With your proposal</b>
              <Chip tone={changed.length ? "review" : "allow"}>{changed.length} would change</Chip>
            </div>
            <div className="row">
              {(["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[]).map((d) => (
                <div key={d} className="row" style={{ gap: 5 }}><DecisionChip d={d} small /><b className="mono">{count("prop", d)}</b></div>
              ))}
            </div>
          </div>
        </div>

        {weakened.length > 0 && (
          <div className="card" style={{ marginTop: 16, borderColor: "var(--bad)" }}>
            <div className="row" style={{ alignItems: "flex-start", gap: 10, flexWrap: "nowrap" }}>
              <ShieldAlert size={18} style={{ color: "var(--bad)", flexShrink: 0, marginTop: 1 }} />
              <div className="small dim" style={{ lineHeight: 1.55 }}>
                <b style={{ color: "var(--bad)" }}>Heads up:</b> {weakened.length} action{weakened.length === 1 ? "" : "s"} that are
                protected today would simply be <b>allowed</b>. Safety Kernel rules still apply either way — for example, secret
                keys stay blocked even if every company rule is switched off.{" "}
                <a onClick={() => nav("safety")}>Safety Kernel</a>
              </div>
            </div>
          </div>
        )}

        <div className="card card-pad-0" style={{ marginTop: 16 }}>
          <table className="tbl">
            <thead><tr><th>{source === "history" ? "What happened" : "Scenario"}</th><th>Today</th><th></th><th>Proposal</th></tr></thead>
            <tbody>
              {[...changed, ...rows.filter((r) => r.current === r.prop)].map((r) => (
                <tr key={r.key} style={r.current !== r.prop ? { background: "var(--warn-soft)" } : undefined}>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "nowrap", alignItems: "flex-start" }}>
                      {r.user && <Avatar userId={r.user} size={18} />}
                      <div>
                        <div className="small" style={{ fontWeight: 550 }}>{r.title}</div>
                        <div className="small faint">{r.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td><DecisionChip d={r.current} small /></td>
                  <td className="faint">{r.current !== r.prop ? "→" : "="}</td>
                  <td><DecisionChip d={r.prop} small /></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4}><div className="empty">No recorded actions to replay yet — run something in the Simulation Lab.</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="small faint" style={{ marginTop: 8 }}>Rows that would change are listed first.</div>
      </div>

      <div className="section">
        <SectionHead title="3 · Make it real" sub="This page never changes enforcement. When you're happy with the result, switch the rules on or off in Intent Studio." />
        <button className="btn btn-primary btn-sm" onClick={() => nav("intent")}>Open Intent Studio <ArrowRight size={13} /></button>
      </div>
    </div>
  );
}
