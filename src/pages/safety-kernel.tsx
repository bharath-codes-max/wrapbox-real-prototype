// Safety Kernel — baseline protections that exist even with zero contracts.
import { useAppState, simulateById } from "../state/store";
import { PageHead, Chip, SimNote, SectionHead } from "../ui/kit";
import { SAFETY_RULES } from "../engine/brain";
import { EventStream } from "../ui/event-stream";
import { useState } from "react";
import { ShieldCheck, Play, KeyRound, History } from "lucide-react";

export function SafetyKernelPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [ran, setRan] = useState(false);
  const kernelEvents = s.events.filter((e) => e.safetyRules.length > 0);
  const hitCount = (ruleId: string) => s.events.filter((e) => e.safetyRules.some((r) => r.ruleId === ruleId)).length;

  return (
    <div className="page">
      <PageHead
        eyebrow="Policy"
        title="Safety Kernel"
        sub="A small set of built-in invariants that protect the enterprise even when no administrator has written an Intent Contract. Narrow, explainable — not a hidden ruleset."
        right={<SimNote />}
      />

      <div className="section">
        <SectionHead
          title="Built-in invariants"
          sub="Always-on baseline protections, evaluated below explicit enterprise forbids and above permits"
        />
        <div className="grid g2">
          {SAFETY_RULES.map((r) => (
            <div className="card" key={r.ruleId}>
              <div className="spread">
                <div className="row" style={{ gap: 10 }}>
                  <div className="stat-icon"><ShieldCheck size={17} /></div>
                  <b>{r.name}</b>
                </div>
                <Chip tone={hitCount(r.ruleId) > 0 ? "block" : "neutral"}>{hitCount(r.ruleId)} enforced</Chip>
              </div>
              <div className="small dim" style={{ marginTop: 10 }}>{r.description}</div>
              <div className="small faint mono" style={{ marginTop: 8 }}>{r.ruleId} · precedence: safety invariant (below explicit enterprise forbid, above permits)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <SectionHead
          title="Try it — no contract required"
          sub="Exercise the kernel against traffic that no Intent Contract covers"
        />
        <div className="card">
          <div className="row" style={{ gap: 10 }}>
            <div className="stat-icon"><KeyRound size={17} /></div>
            <b>Credential exfiltration</b>
          </div>
          <div className="small dim" style={{ margin: "10px 0 14px", lineHeight: 1.5 }}>
            No Intent Contract mentions SSH private keys. Simulate an agent attempting to POST <span className="mono">~/.ssh/id_rsa</span> to
            an unknown external website — the Safety Kernel blocks it as credential exfiltration.
          </div>
          <div className="row" style={{ gap: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => { simulateById("sk-privkey-exfil"); setRan(true); }}>
              <Play size={13} /> Simulate private-key exfiltration
            </button>
            {ran && <span className="small" style={{ color: "var(--good)" }}>Blocked — see the event below and in Evidence.</span>}
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead
          title="Enforcement history"
          sub="Every decision where a Safety Kernel invariant fired"
          right={<History size={16} className="faint" />}
        />
        {kernelEvents.length === 0
          ? <div className="card empty">No baseline-safety enforcement yet.</div>
          : <div className="card card-pad-0"><EventStream events={kernelEvents} nav={nav} compact filters={false} bare /></div>}
      </div>
    </div>
  );
}
