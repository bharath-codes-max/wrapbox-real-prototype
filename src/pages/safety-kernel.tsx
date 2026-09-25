// Safety Kernel — Wrapbox-managed, versioned baseline rules that protect even
// with zero company rules. Updates arrive with release notes; new rules start
// in observe mode ("would have blocked") before they enforce.
import { useMemo, useState } from "react";
import {
  useAppState, simulateById, shadowEvent, installKernelUpdate, enforceKernelRule,
} from "../state/store";
import { PageHead, Chip, SimNote, SectionHead, DecisionChip, MetricBar } from "../ui/kit";
import {
  KERNEL_RELEASES, OBSERVE_WINDOW_DAYS, effectiveMode, factsFromEvent, installedRules,
  kernelRule, pendingRelease, type KernelRule,
} from "../engine/kernel";
import { scenarioById } from "../engine/scenarios";
import { EventStream } from "../ui/event-stream";
import { describe } from "../ui/describe";
import type { SimulationEvent } from "../model/types";
import {
  ShieldCheck, Play, History, FileText, ShieldOff, BadgeCheck, Download, Eye, Lock, Sparkles,
} from "lucide-react";

const fmtDate = (d: string | number) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function SafetyKernelPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [ran, setRan] = useState(false);
  const now = Date.now();
  const k = s.kernel;
  const update = pendingRelease(k);
  const kernelEvents = s.events.filter((e) => e.safetyRules.length > 0 || (e.safetyObserved?.length ?? 0) > 0);

  // "fired" = the rule matched; "decided" = it produced the outcome.
  const fired = (id: string) => s.events.filter((e) => e.safetyRules.some((r) => r.ruleId === id)).length;
  const decided = (id: string) => s.events.filter((e) => e.decidedBy?.layer === "safety" && e.decidedBy.ruleId === id).length;
  // Replay a rule over recorded history: which past actions would it have
  // blocked that were NOT blocked at the time?
  const wouldChange = (r: KernelRule): SimulationEvent[] =>
    s.events.filter((e) => e.decision !== "BLOCK" && r.test(factsFromEvent(e)));

  const trial = useMemo(() => {
    const sc = scenarioById("sk-privkey-exfil")!;
    return { withRules: shadowEvent(sc, s.contracts), noRules: shadowEvent(sc, []) };
  }, [s.contracts, s.kernel]);

  const rules = installedRules(k);
  const updateRules = (update?.adds ?? []).map((id) => kernelRule(id)!).filter(Boolean);

  // Summary of the managed pack, derived live from kernel + event state.
  const enforcingCount = rules.filter((r) => effectiveMode(k, r.ruleId, now) === "enforcing").length;
  const observingCount = rules.length - enforcingCount;
  const protectedCount = s.events.filter((e) => e.decidedBy?.layer === "safety").length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Policy"
        title="Safety Kernel"
        sub="Built-in rules that are always on — they protect the company even when nobody has written an Intent Contract. Written and maintained by Wrapbox's security team; your team can see every rule but can't edit or delete them."
        right={<SimNote>Update channel simulated · rules evaluated live</SimNote>}
      />

      {/* Hero — the managed pack: identity, version, live summary */}
      <div className="card kernel-banner" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "22px 24px" }}>
          <div className="row" style={{ gap: 15, flexWrap: "nowrap", alignItems: "flex-start" }}>
            <div className="stat-icon" style={{ width: 42, height: 42, borderRadius: 11, background: "var(--accent-soft)", color: "var(--accent)" }}>
              <BadgeCheck size={21} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 9 }}>
                <b style={{ fontSize: 16.5, letterSpacing: "-0.01em" }}>Wrapbox Safety Kernel</b>
                <Chip tone="neutral">v{k.version}</Chip>
                {update ? <Chip tone="review">Update available</Chip> : <Chip tone="allow">Up to date</Chip>}
              </div>
              <div className="small dim" style={{ marginTop: 8, lineHeight: 1.6, maxWidth: 680 }}>
                Managed by Wrapbox and delivered as versioned updates, like built-in detection rules in other security
                products. New rules arrive in <b>Observe</b> mode first — they record what they <i>would</i> have blocked for{" "}
                {OBSERVE_WINDOW_DAYS} days, then start enforcing automatically. Rules can't be switched off; a genuine emergency
                goes through <a onClick={() => nav("breakglass")}>Break Glass</a>, which is time-limited and audited.
              </div>
            </div>
          </div>
        </div>
        <div className="overview-sep" style={{ margin: 0 }} />
        <div style={{ padding: "16px 24px" }}>
          <MetricBar band items={[
            { label: "Built-in rules", value: rules.length, note: `managed in v${k.version}` },
            { label: "Enforcing", value: enforcingCount, tone: "good", note: "changing decisions now" },
            { label: "Observing", value: observingCount, tone: observingCount > 0 ? "warn" : undefined, note: observingCount > 0 ? "in trial window" : "none in trial" },
            { label: "Actions protected", value: protectedCount, tone: protectedCount > 0 ? "good" : undefined, note: "kernel made the call" },
          ]} />
        </div>
      </div>

      {/* Update available */}
      {update && (
        <div className="card kernel-update">
          <div className="spread" style={{ alignItems: "flex-start" }}>
            <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "flex-start" }}>
              <div className="stat-icon" style={{ background: "var(--review-soft)", color: "var(--review)" }}><Sparkles size={17} /></div>
              <div>
                <b>Update v{update.version}</b>
                <div className="small faint" style={{ marginTop: 2 }}>Released by Wrapbox · {fmtDate(update.date)}</div>
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => installKernelUpdate()}>
              <Download size={13} /> Install update
            </button>
          </div>
          <ul className="small dim" style={{ margin: "14px 0 0", paddingLeft: 18, lineHeight: 1.65 }}>
            {update.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
          {updateRules.map((r) => {
            const hits = wouldChange(r);
            return (
              <div key={r.ruleId} className="kernel-impact">
                <b className="small">Impact on your history: </b>
                <span className="small">
                  {hits.length === 0
                    ? "it would not have changed any past decision."
                    : <>it would have changed <b>{hits.length}</b> past decision{hits.length === 1 ? "" : "s"} to BLOCK:</>}
                </span>
                {hits.slice(0, 3).map((e) => (
                  <div key={e.id} className="row small" style={{ gap: 8, marginTop: 6 }}>
                    <DecisionChip d={e.decision} small /><span>→</span><DecisionChip d="BLOCK" small />
                    <span className="dim">{describe(e)}</span>
                  </div>
                ))}
                <div className="small faint" style={{ marginTop: 8 }}>
                  Installing is safe: the new rule starts in Observe mode and changes nothing until it enforces.
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Built-in rules — a refined list, not number boxes */}
      <div className="section">
        <SectionHead
          title="Built-in rules"
          sub="They rank below an explicit company BLOCK and above any company permission."
          right={<span className="small faint">{enforcingCount} enforcing{observingCount > 0 ? ` · ${observingCount} observing` : ""}</span>}
        />
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {rules.map((r, i) => {
            const mode = effectiveMode(k, r.ruleId, now);
            const observing = mode === "observing";
            const observedCount = s.events.filter((e) => e.safetyObserved?.some((x) => x.ruleId === r.ruleId)).length;
            return (
              <div
                key={r.ruleId}
                style={{
                  padding: "16px 20px",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  background: observing ? "color-mix(in oklab, var(--review-soft) 40%, var(--surface))" : undefined,
                }}
              >
                <div className="spread" style={{ alignItems: "flex-start", gap: 14 }}>
                  <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "flex-start", minWidth: 0 }}>
                    <div
                      className="stat-icon"
                      style={observing
                        ? { color: "var(--review)", background: "var(--review-soft)" }
                        : { color: "var(--allow)", background: "var(--allow-soft)" }}
                    >
                      {observing ? <Eye size={16} /> : <ShieldCheck size={16} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <b>{r.name}</b>
                        <span className="small faint mono">v{r.since}</span>
                      </div>
                      <div className="small dim" style={{ marginTop: 3, lineHeight: 1.5 }}>{r.description}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    {observing ? <Chip tone="review">OBSERVING</Chip> : <Chip tone="allow">ENFORCING</Chip>}
                    <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      {observing ? (
                        <Chip tone={observedCount > 0 ? "review" : "pending"}>would have blocked {observedCount}</Chip>
                      ) : (
                        <>
                          <Chip tone={fired(r.ruleId) > 0 ? "neutral" : "pending"}>fired {fired(r.ruleId)}</Chip>
                          <Chip tone={decided(r.ruleId) > 0 ? "block" : "pending"}>decided {decided(r.ruleId)}</Chip>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {observing && (
                  <div className="kernel-observe-foot">
                    <span className="small dim">
                      Recording only. Starts enforcing on <b>{fmtDate(k.observeUntil[r.ruleId] ?? now)}</b>.
                    </span>
                    <button className="btn btn-sm" onClick={() => enforceKernelRule(r.ruleId)}>
                      <Lock size={13} /> Start enforcing now
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="small faint" style={{ marginTop: 12 }}>
          <b>Fired</b> = the rule matched an action. <b>Decided</b> = it made the final call. A rule can fire without
          deciding when a company rule already blocked the same action — then it's a second lock.
        </div>
      </div>

      {/* Live proof — does it still protect with zero rules? */}
      <div className="section">
        <SectionHead
          title="Try it — does it still protect with zero rules?"
          sub="An unknown program tries to send an SSH private key (~/.ssh/id_rsa) to an unknown website"
        />
        <div className="grid g2">
          {([
            { key: "with", title: "With your rules switched on", cap: "Company rules + Safety Kernel", icon: <FileText size={17} />, ev: trial.withRules },
            { key: "none", title: "As if nobody wrote any rules", cap: "Safety Kernel alone", icon: <ShieldOff size={17} />, ev: trial.noRules },
          ] as const).map((t) => (
            <div className="card" key={t.key}>
              <div className="spread" style={{ alignItems: "flex-start" }}>
                <div className="row" style={{ gap: 10 }}>
                  <div className="stat-icon">{t.icon}</div>
                  <div>
                    <b className="small">{t.title}</b>
                    <div className="small faint" style={{ marginTop: 2 }}>{t.cap}</div>
                  </div>
                </div>
                <DecisionChip d={t.ev.decision} />
              </div>
              <dl className="kv" style={{ marginTop: 14, gridTemplateColumns: "104px 1fr" }}>
                <dt>Decided by</dt>
                <dd style={{ fontWeight: 550 }}>{t.ev.decidedBy?.label ?? "—"}</dd>
                {t.ev.safetyRules.length > 0 && (
                  <>
                    <dt>Kernel fired</dt>
                    <dd className="dim">{t.ev.safetyRules.map((r) => r.name).join(", ")}</dd>
                  </>
                )}
              </dl>
            </div>
          ))}
        </div>
        <div className="small dim" style={{ marginTop: 12, lineHeight: 1.55 }}>
          {trial.withRules.decidedBy?.layer === "contract"
            ? <>Today a company rule catches this first, so the Safety Kernel is the <b>second lock</b>. Switch every rule off and the Safety Kernel still blocks it on its own.</>
            : <>No company rule covers this, so the Safety Kernel is what blocks it.</>}
          {" "}Both previews run through the real Core Brain; nothing is recorded until you press the button.
        </div>
        <div className="row" style={{ gap: 12, marginTop: 14 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { simulateById("sk-privkey-exfil"); setRan(true); }}>
            <Play size={13} /> Run it for real
          </button>
          {ran && <span className="small" style={{ color: "var(--good)" }}>Blocked — recorded below, in Live Actions and in Evidence.</span>}
        </div>
      </div>

      {/* Where the kernel fired */}
      <div className="section">
        <SectionHead
          title="Where these rules fired"
          sub="Every action where a Safety Kernel rule matched — deciding, as a second lock, or observing"
          right={<><History size={15} className="faint" /><span className="small faint">{kernelEvents.length} recorded</span></>}
        />
        {kernelEvents.length === 0
          ? <div className="card empty">No Safety Kernel rule has fired yet.</div>
          : <div className="card card-pad-0"><EventStream events={kernelEvents} nav={nav} compact filters={false} bare /></div>}
      </div>

      {/* Release history */}
      <div className="section">
        <SectionHead
          title="Release history"
          sub="Every Safety Kernel version Wrapbox has shipped"
          right={<span className="small faint">{KERNEL_RELEASES.length} versions</span>}
        />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Version</th><th>Released</th><th>What changed</th><th>Status</th></tr></thead>
            <tbody>
              {[...KERNEL_RELEASES].reverse().map((rel) => {
                const installed = rel.adds.every((id) => k.modes[id]);
                const current = rel.version === k.version;
                return (
                  <tr key={rel.version}>
                    <td className="mono small">
                      <div className="row" style={{ gap: 7 }}>
                        <b>v{rel.version}</b>
                        {current && <Chip tone="neutral">current</Chip>}
                      </div>
                    </td>
                    <td className="small">{fmtDate(rel.date)}</td>
                    <td className="small dim">{rel.notes[0]}</td>
                    <td>{installed ? <Chip tone="allow">installed</Chip> : <Chip tone="review">available</Chip>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
