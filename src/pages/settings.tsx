// Settings — demo data reset + what is real vs simulated.
import { useState } from "react";
import { resetDemoData, useAppState, metrics } from "../state/store";
import { PageHead, SimNote } from "../ui/kit";

export function SettingsPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = metrics(s);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="page">
      <PageHead title="Settings" sub="Wrapbox Real Prototype — demo environment controls." right={<SimNote />} />
      <div className="card">
        <div className="card-title">Demo data</div>
        <div className="small dim" style={{ marginBottom: 10 }}>
          Current state: {m.total} events · {s.contracts.length} contracts · {s.tokens.length} vault tokens · {s.tasks.length} tasks.
          State persists in your browser across refreshes.
        </div>
        {!confirming ? (
          <button className="btn btn-danger" onClick={() => setConfirming(true)}>Reset demo data</button>
        ) : (
          <div className="row">
            <span className="small">Discard all events, reviews, tasks and drafted contracts and restore the seed?</span>
            <button className="btn btn-danger btn-sm" onClick={() => { resetDemoData(); setConfirming(false); nav("control"); }}>Yes, reset</button>
            <button className="btn btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-title">What is real vs simulated in this prototype</div>
        <div className="grid g2">
          <div>
            <b className="small" style={{ color: "var(--good)" }}>Real (live behavior)</b>
            <ul className="small dim" style={{ paddingLeft: 18, marginTop: 4 }}>
              <li>The decision engine: contracts, Safety Kernel, blast radius, context, envelopes</li>
              <li>State transitions: approvals, denials, park/resume, break-glass expiry</li>
              <li>Transformations: payloads genuinely change; tokens genuinely link to the vault</li>
              <li>Every counter and chart derives from the event store</li>
              <li>Policy changes genuinely change simulation outcomes</li>
              <li>Evidence chains built per-event with linked hashes</li>
            </ul>
          </div>
          <div>
            <b className="small" style={{ color: "var(--warn)" }}>Simulated (representative)</b>
            <ul className="small dim" style={{ paddingLeft: 18, marginTop: 4 }}>
              <li>All integrations: GitHub, SQL, AWS, MCP, SSO, Endpoint Security, Network Extension</li>
              <li>Detector/OCR/semantic analysis results (registry-shaped fixtures)</li>
              <li>Veridian Systems org, users, devices and traffic history</li>
              <li>Evidence signing (hash chain is illustrative, not cryptographic)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
