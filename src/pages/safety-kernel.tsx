// Safety Kernel — baseline protections that exist even with zero contracts.
import { useAppState, simulateById } from "../state/store";
import { PageHead, Chip, SimNote } from "../ui/kit";
import { SAFETY_RULES } from "../engine/brain";
import { EventStream } from "../ui/event-stream";
import { useState } from "react";

export function SafetyKernelPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [ran, setRan] = useState(false);
  const kernelEvents = s.events.filter((e) => e.safetyRules.length > 0);
  const hitCount = (ruleId: string) => s.events.filter((e) => e.safetyRules.some((r) => r.ruleId === ruleId)).length;

  return (
    <div className="page">
      <PageHead
        title="Safety Kernel"
        sub="A small set of built-in invariants that protect the enterprise even when no administrator has written an Intent Contract. Narrow, explainable — not a hidden ruleset."
        right={<SimNote />}
      />
      <div className="grid g2">
        {SAFETY_RULES.map((r) => (
          <div className="card" key={r.ruleId}>
            <div className="spread">
              <b>{r.name}</b>
              <Chip tone={hitCount(r.ruleId) > 0 ? "block" : "neutral"}>{hitCount(r.ruleId)} enforced</Chip>
            </div>
            <div className="small dim" style={{ marginTop: 4 }}>{r.description}</div>
            <div className="small faint mono" style={{ marginTop: 6 }}>{r.ruleId} · precedence: safety invariant (below explicit enterprise forbid, above permits)</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16, borderColor: "var(--border-strong)" }}>
        <b className="small">Try it — no contract required</b>
        <div className="small dim" style={{ margin: "4px 0 10px" }}>
          No Intent Contract mentions SSH private keys. Simulate an agent attempting to POST <span className="mono">~/.ssh/id_rsa</span> to
          an unknown external website — the Safety Kernel blocks it as credential exfiltration.
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { simulateById("sk-privkey-exfil"); setRan(true); }}>
          ▶ Simulate private-key exfiltration
        </button>
        {ran && <span className="small" style={{ marginLeft: 10, color: "var(--good)" }}>Blocked — see the event below and in Evidence.</span>}
      </div>

      <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>Safety Kernel enforcement history</h2>
      {kernelEvents.length === 0
        ? <div className="card empty">No baseline-safety enforcement yet.</div>
        : <EventStream events={kernelEvents} nav={nav} compact filters={false} />}
    </div>
  );
}
