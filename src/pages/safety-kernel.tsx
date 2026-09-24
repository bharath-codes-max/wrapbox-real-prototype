// Safety Kernel — Wrapbox-managed, versioned baseline rules that protect even
// with zero company rules. Updates arrive with release notes; new rules start
// in observe mode ("would have blocked") before they enforce.
import { useMemo, useState } from "react";
import {
  useAppState, simulateById, shadowEvent, installKernelUpdate, enforceKernelRule,
} from "../state/store";
import { PageHead, Chip, SimNote, SectionHead, DecisionChip } from "../ui/kit";
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

  return (
    <div className="page">
      <PageHead
        eyebrow="Policy"
        title="Safety Kernel"
        sub="Built-in rules that are always on — they protect the company even when nobody has written an Intent Contract. Written and maintained by Wrapbox's security team; your team can see every rule but can't edit or delete them."
        right={<SimNote>Update channel simulated · rules evaluated live</SimNote>}
      />

      {/* Managed-by-Wrapbox banner */}
      <div className="card kernel-banner">
        <div className="row" style={{ gap: 14, flexWrap: "nowrap", alignItems: "flex-start" }}>
          <div className="stat-icon" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}><BadgeCheck size={18} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <b>Wrapbox Safety Kernel</b>
              <Chip tone="neutral">v{k.version}</Chip>
              {update ? <Chip tone="review">Update available</Chip> : <Chip tone="allow">Up to date</Chip>}
            </div>
            <div className="small dim" style={{ marginTop: 6, lineHeight: 1.55 }}>
              Managed by Wrapbox and delivered as versioned updates, like built-in detection rules in other security
              products. New rules arrive in <b>Observe</b> mode first — they record what they <i>would</i> have blocked for{" "}
              {OBSERVE_WINDOW_DAYS} days, then start enforcing automatically. Rules can't be switched off; a genuine emergency
              goes through <a onClick={() => nav("breakglass")}>Break Glass</a>, which is time-limited and audited.
            </div>
          </div>
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

      <div className="section">
        <SectionHead
          title="Built-in rules"
          sub={`${rules.length} rules in v${k.version}. They rank below an explicit company BLOCK and above any company permission.`}
        />
        <div className="grid g2">
          {rules.map((r) => {
            const mode = effectiveMode(k, r.ruleId, now);
            const observing = mode === "observing";
            const observedCount = s.events.filter((e) => e.safetyObserved?.some((x) => x.ruleId === r.ruleId)).length;
            return (
              <div className={`card ${observing ? "kernel-observing" : ""}`} key={r.ruleId}>
                <div className="spread" style={{ alignItems: "flex-start" }}>
                  <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                    <div className="stat-icon">{observing ? <Eye size={17} /> : <ShieldCheck size={17} />}</div>
                    <b>{r.name}</b>
                  </div>
                  {observing ? <Chip tone="review">OBSERVING</Chip> : <Chip tone="allow">ENFORCING</Chip>}
                </div>
                <div className="small dim" style={{ marginTop: 10 }}>{r.description}</div>
                <div className="row" style={{ gap: 6, marginTop: 12 }}>
                  {observing ? (
                    <Chip tone={observedCount > 0 ? "review" : "pending"}>would have blocked {observedCount}</Chip>
                  ) : (
                    <>
                      <Chip tone={fired(r.ruleId) > 0 ? "neutral" : "pending"}>fired {fired(r.ruleId)}</Chip>
                      <Chip tone={decided(r.ruleId) > 0 ? "block" : "pending"}>decided {decided(r.ruleId)}</Chip>
                    </>
                  )}
                  <span className="small faint mono" style={{ marginLeft: "auto" }}>since v{r.since}</span>
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

      <div className="section">
        <SectionHead
          title="Try it — does it still protect with zero rules?"
          sub="An unknown program tries to send an SSH private key (~/.ssh/id_rsa) to an unknown website"
        />
        <div className="grid g2">
          {([
            { key: "with", title: "With your rules switched on", icon: <FileText size={17} />, ev: trial.withRules },
            { key: "none", title: "As if nobody wrote any rules", icon: <ShieldOff size={17} />, ev: trial.noRules },
          ] as const).map((t) => (
            <div className="card" key={t.key}>
              <div className="spread">
                <div className="row" style={{ gap: 10 }}>
                  <div className="stat-icon">{t.icon}</div>
                  <b className="small">{t.title}</b>
                </div>
                <DecisionChip d={t.ev.decision} />
              </div>
              <div className="small dim" style={{ marginTop: 12 }}>Decided by</div>
              <div className="small" style={{ fontWeight: 550, marginTop: 2 }}>{t.ev.decidedBy?.label ?? "—"}</div>
              {t.ev.safetyRules.length > 0 && (
                <div className="small faint" style={{ marginTop: 8 }}>
                  Safety Kernel fired: {t.ev.safetyRules.map((r) => r.name).join(", ")}
                </div>
              )}
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

      <div className="section">
        <SectionHead
          title="Where these rules fired"
          sub="Every action where a Safety Kernel rule matched — deciding, as a second lock, or observing"
          right={<History size={16} className="faint" />}
        />
        {kernelEvents.length === 0
          ? <div className="card empty">No Safety Kernel rule has fired yet.</div>
          : <div className="card card-pad-0"><EventStream events={kernelEvents} nav={nav} compact filters={false} bare /></div>}
      </div>

      <div className="section">
        <SectionHead title="Release history" sub="Every Safety Kernel version Wrapbox has shipped" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Version</th><th>Released</th><th>What changed</th><th>Status</th></tr></thead>
            <tbody>
              {[...KERNEL_RELEASES].reverse().map((rel) => {
                const installed = rel.adds.every((id) => k.modes[id]);
                return (
                  <tr key={rel.version}>
                    <td className="mono small"><b>v{rel.version}</b></td>
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
