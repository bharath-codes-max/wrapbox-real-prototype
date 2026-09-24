// Safety Kernel — baseline protections that exist even with zero contracts.
import { useMemo, useState } from "react";
import { useAppState, simulateById, shadowEvent } from "../state/store";
import { PageHead, Chip, SimNote, SectionHead, DecisionChip } from "../ui/kit";
import { SAFETY_RULES } from "../engine/brain";
import { scenarioById } from "../engine/scenarios";
import { EventStream } from "../ui/event-stream";
import { ShieldCheck, Play, KeyRound, History, FileText, ShieldOff } from "lucide-react";

export function SafetyKernelPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [ran, setRan] = useState(false);
  const kernelEvents = s.events.filter((e) => e.safetyRules.length > 0);
  // "fired" = the rule matched; "decided" = it was the rule that produced the outcome.
  const fired = (ruleId: string) => s.events.filter((e) => e.safetyRules.some((r) => r.ruleId === ruleId)).length;
  const decided = (ruleId: string) => s.events.filter((e) => e.decidedBy?.layer === "safety" && e.decidedBy.ruleId === ruleId).length;

  // Same action, judged twice by the real brain: with the rules switched on
  // right now, and as if the company had written no rules at all.
  const trial = useMemo(() => {
    const sc = scenarioById("sk-privkey-exfil")!;
    return { withRules: shadowEvent(sc, s.contracts), noRules: shadowEvent(sc, []) };
  }, [s.contracts]);

  return (
    <div className="page">
      <PageHead
        eyebrow="Policy"
        title="Safety Kernel"
        sub="A small set of built-in rules that are always on — they protect the company even when nobody has written an Intent Contract. Narrow and explainable, not a hidden ruleset."
        right={<SimNote />}
      />

      <div className="section">
        <SectionHead
          title="Built-in rules"
          sub="Always on. They rank below an explicit company BLOCK and above any company permission."
        />
        <div className="grid g2">
          {SAFETY_RULES.map((r) => (
            <div className="card" key={r.ruleId}>
              <div className="spread">
                <div className="row" style={{ gap: 10 }}>
                  <div className="stat-icon"><ShieldCheck size={17} /></div>
                  <b>{r.name}</b>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Chip tone={fired(r.ruleId) > 0 ? "neutral" : "pending"}>fired {fired(r.ruleId)}</Chip>
                  <Chip tone={decided(r.ruleId) > 0 ? "block" : "pending"}>decided {decided(r.ruleId)}</Chip>
                </div>
              </div>
              <div className="small dim" style={{ marginTop: 10 }}>{r.description}</div>
              <div className="small faint mono" style={{ marginTop: 8 }}>{r.ruleId}</div>
            </div>
          ))}
        </div>
        <div className="small faint" style={{ marginTop: 12 }}>
          <b>Fired</b> = the rule matched an action. <b>Decided</b> = it was the rule that made the final call.
          A rule can fire without deciding when a company rule already blocked the same action — then it's a second lock.
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
          <KeyRound size={14} className="faint" />
        </div>
      </div>

      <div className="section">
        <SectionHead
          title="Where these rules fired"
          sub="Every action where a Safety Kernel rule matched — as the deciding rule or as a second lock"
          right={<History size={16} className="faint" />}
        />
        {kernelEvents.length === 0
          ? <div className="card empty">No Safety Kernel rule has fired yet.</div>
          : <div className="card card-pad-0"><EventStream events={kernelEvents} nav={nav} compact filters={false} bare /></div>}
      </div>
    </div>
  );
}
