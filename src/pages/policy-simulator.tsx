// Policy Simulator / Shadow Mode — "if this policy had been in force during
// these events, what would have happened?" Replays the company's own recorded
// history (and the scenario library) through the real Core Brain under the
// current rules and under a proposed set. A preview only: nothing is enforced
// or recorded from this page — changes become real in Intent Studio.
import { useMemo, useState, type ReactNode } from "react";
import { useAppState, shadowEvaluate } from "../state/store";
import { PageHead, DecisionChip, Chip, SimNote, Avatar, timeAgo, PageTabs, usePaged, Pager } from "../ui/kit";
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

const DECS = ["ALLOW", "CONSTRAIN", "REVIEW", "BLOCK"] as Decision[];
const DTONE: Record<string, string> = { ALLOW: "allow", CONSTRAIN: "constrain", REVIEW: "review", BLOCK: "block" };

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

  const orderedRows = [...changed, ...rows.filter((r) => r.current === r.prop)];

  // Replay table pagination — back to page 1 whenever the source or the proposal changes.
  const pageKey = `${source}|${[...removed].sort().join(",")}|${[...added].sort().join(",")}`;
  const paged = usePaged(orderedRows, 10, pageKey);

  // One-line intro at the top of each tab (the tab label carries the act number and title).
  const tabIntro = (sub: string, right?: ReactNode) => (
    <div className="section-head" style={{ alignItems: "center" }}>
      <div className="section-sub" style={{ marginTop: 0 }}>{sub}</div>
      {right && <div className="row" style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );

  // Proportional decision-mix bar + legend — the visual before/after contrast.
  const renderDist = (which: "current" | "prop") => (
    <>
      <div className="decision-track" style={{ height: 34, borderRadius: 9 }}>
        {rows.length === 0 ? (
          <div className="decision-seg" style={{ flex: 1, background: "var(--surface-3)" }} />
        ) : (
          DECS.map((d) => {
            const n = count(which, d);
            return n ? (
              <div
                key={d}
                className="decision-seg"
                title={`${d} · ${n}`}
                style={{ flex: `${n} 0 0`, background: `var(--${DTONE[d]})` }}
              />
            ) : null;
          })
        )}
      </div>
      <div className="decision-legend" style={{ gap: "8px 22px", marginTop: 12 }}>
        {DECS.map((d) => (
          <div key={d} className="decision-leg" style={{ cursor: "default" }}>
            <span className="dot" style={{ background: `var(--${DTONE[d]})` }} />
            <span className="n tnum">{count(which, d)}</span>
            <span className="lbl">{d}</span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Policy"
        title="Policy Simulator"
        sub="Try a rule change safely: see what would have happened across your company's real history before you switch anything on or off. This page is a preview — nothing is enforced or recorded here."
        right={<SimNote>Replays run through the live Core Brain — nothing is recorded</SimNote>}
      />

      <PageTabs
        storageKey="simulator"
        tabs={[
          {
            id: "propose",
            label: "1 · Propose a change",
            count: edits,
            content: (
      <div>
        {tabIntro(
          "Untick a rule to try switching it off. Tick a switched-off contract to try switching it on.",
          edits ? (
            <Chip tone="review">
              {edits} change{edits === 1 ? "" : "s"} staged
            </Chip>
          ) : (
            <span className="faint small">No changes staged</span>
          )
        )}

        {active.length === 0 && inactive.length === 0 && (
          <div className="card empty">
            No contracts to compare yet. Write one in Intent Studio, then return here to test changes against your history.
          </div>
        )}

        <div className="grid g2">
          {active.map((c) => (
            <div className="card" key={c.id}>
              <div className="spread" style={{ marginBottom: 14 }}>
                <b className="small">{c.name}</b>
                <div className="row" style={{ gap: 8 }}>
                  <span className="faint small">
                    {c.clauses.length} rule{c.clauses.length === 1 ? "" : "s"}
                  </span>
                  <Chip tone="allow">ACTIVE</Chip>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {c.clauses.map((cl) => {
                  const off = removed.has(cl.id);
                  return (
                    <label
                      key={cl.id}
                      className="rule-item"
                      style={{ cursor: "pointer", gap: 10, opacity: off ? 0.6 : 1, flexWrap: "nowrap", alignItems: "flex-start" }}
                    >
                      <input
                        type="checkbox"
                        checked={!off}
                        onChange={() => flip(removed, cl.id, setRemoved)}
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <span
                        className="rule-text"
                        style={off ? { flex: 1, textDecoration: "line-through", color: "var(--fg-3)" } : { flex: 1 }}
                      >
                        {cl.text}
                      </span>
                      <DecisionChip d={cl.effect} small />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          {inactive.map((c) => (
            <div className="card" key={c.id} style={added.has(c.id) ? { borderColor: "var(--accent)" } : undefined}>
              <label className="spread" style={{ cursor: "pointer", marginBottom: 12, flexWrap: "nowrap" }}>
                <span className="row" style={{ gap: 9, flexWrap: "nowrap" }}>
                  <input type="checkbox" checked={added.has(c.id)} onChange={() => flip(added, c.id, setAdded)} style={{ flexShrink: 0 }} />
                  <b className="small">{c.name}</b>
                </span>
                <Chip tone={added.has(c.id) ? "constrain" : "neutral"}>{added.has(c.id) ? "ON IN PREVIEW" : c.status}</Chip>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {c.clauses.map((cl) => (
                  <div
                    key={cl.id}
                    className="row small faint"
                    style={{ gap: 8, paddingLeft: 24, alignItems: "flex-start", flexWrap: "nowrap" }}
                  >
                    <span style={{ flex: 1 }}>{cl.text}</span>
                    <DecisionChip d={cl.effect} small />
                  </div>
                ))}
              </div>
              {!canActivate(c) && (
                <div
                  className="row small"
                  style={{ gap: 7, marginTop: 12, color: "var(--warn)", alignItems: "flex-start", flexWrap: "nowrap" }}
                >
                  <Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Preview only — this contract can't really be switched on yet (a skill it needs is missing).</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
            ),
          },
          {
            id: "impact",
            label: "2 · See what would happen",
            count: changed.length,
            content: (
      <div>
        {tabIntro(
          "Every action replayed under your rules today and under your proposal.",
          <div className="tabs" style={{ marginBottom: 0, borderBottom: "none" }}>
            <button className={`tab ${source === "history" ? "active" : ""}`} onClick={() => setSource("history")}>
              <History size={14} /> Your history <span className="tab-count tnum">{history.length}</span>
            </button>
            <button className={`tab ${source === "library" ? "active" : ""}`} onClick={() => setSource("library")}>
              <Library size={14} /> Scenario library <span className="tab-count tnum">{SCENARIOS.length}</span>
            </button>
          </div>
        )}

        {/* Before / after decision-mix — same width, side by side, for a clean diff */}
        <div className="card">
          <div className="spread" style={{ marginBottom: 20 }}>
            <div className="row" style={{ gap: 9 }}>
              <GitCompare size={16} style={{ color: "var(--accent)" }} />
              <b>Impact preview</b>
              <span className="faint small">
                {source === "history" ? "across your recorded history" : "across the scenario library"}
              </span>
            </div>
            <span className={`chip ${changed.length ? "c-review" : "c-allow"}`} style={{ fontSize: 11 }}>
              {changed.length} of {rows.length} outcomes change
            </span>
          </div>

          <div className="grid g2" style={{ gap: "24px 40px" }}>
            <div>
              <div className="spread" style={{ marginBottom: 10 }}>
                <b className="small">Your rules today</b>
                <span className="faint small">what Wrapbox enforces now</span>
              </div>
              {renderDist("current")}
            </div>
            <div>
              <div className="spread" style={{ marginBottom: 10 }}>
                <b className="small">With your proposal</b>
                <Chip tone={changed.length ? "review" : "allow"}>{changed.length} would change</Chip>
              </div>
              {renderDist("prop")}
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

        {rows.length === 0 ? (
          <div className="card empty" style={{ marginTop: 16 }}>
            No recorded actions to replay yet — run something in the Simulation Lab.
          </div>
        ) : (
        <>
        <div className="card card-pad-0" style={{ marginTop: 16 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>{source === "history" ? "What happened" : "Scenario"}</th>
                <th>Today</th>
                <th></th>
                <th>Proposal</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((r) => (
                <tr key={r.key} style={r.current !== r.prop ? { background: "var(--warn-soft)" } : undefined}>
                  <td>
                    <div className="row" style={{ gap: 9, flexWrap: "nowrap", alignItems: "flex-start" }}>
                      {r.user && <Avatar userId={r.user} size={20} />}
                      <div style={{ minWidth: 0 }}>
                        <div className="small" style={{ fontWeight: 550 }}>{r.title}</div>
                        <div className="small faint">{r.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td><DecisionChip d={r.current} small /></td>
                  <td style={{ textAlign: "center", width: 40 }}>
                    {r.current !== r.prop ? (
                      <ArrowRight size={14} style={{ color: "var(--review)" }} />
                    ) : (
                      <span className="faint">=</span>
                    )}
                  </td>
                  <td><DecisionChip d={r.prop} small /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager {...paged} />
        </div>
        <div className="small faint" style={{ marginTop: 8 }}>Rows that would change are listed first.</div>
        </>
        )}
      </div>
            ),
          },
          {
            id: "apply",
            label: "3 · Make it real",
            content: (
      <div>
        {tabIntro(
          "This page never changes enforcement. When you're happy with the result, switch the rules on or off in Intent Studio."
        )}
        <div className="card">
          <div className="spread" style={{ gap: 16 }}>
            <div className="small dim" style={{ lineHeight: 1.55, maxWidth: 620 }}>
              Nothing here is enforced or recorded. Intent Studio is where a proposed change becomes a real rule.
            </div>
            <button className="btn btn-primary" onClick={() => nav("intent")}>
              Open Intent Studio <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
            ),
          },
        ]}
      />
    </div>
  );
}
