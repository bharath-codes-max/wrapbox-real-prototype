// Settings — demo data reset + what is real vs simulated.
import { useState } from "react";
import { resetDemoData, useAppState, metrics } from "../state/store";
import { PageHead, SectionHead, Stat, SimNote } from "../ui/kit";
import { Activity, FileText, KeyRound, ListChecks, RotateCcw, CheckCircle2, FlaskConical } from "lucide-react";

export function SettingsPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = metrics(s);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="page">
      <PageHead
        eyebrow="System"
        title="Settings"
        sub="Wrapbox Real Prototype — demo environment controls."
        right={<SimNote />}
      />

      <div className="section">
        <SectionHead title="Demo environment" sub="State persists in your browser across refreshes. Every figure derives from the live event store." />
        <div className="grid g4">
          <Stat icon={<Activity size={17} />} label="Events" value={m.total} note="decisions recorded" />
          <Stat icon={<FileText size={17} />} label="Contracts" value={s.contracts.length} tone="info" note="policies in force" />
          <Stat icon={<KeyRound size={17} />} label="Vault tokens" value={s.tokens.length} tone="good" note="linked to the vault" />
          <Stat icon={<ListChecks size={17} />} label="Tasks" value={s.tasks.length} note="agent workflows" />
        </div>
      </div>

      <div className="section">
        <SectionHead title="Reset demo data" sub="Discard all events, reviews, tasks and drafted contracts, then restore the seed." />
        <div className="card">
          {!confirming ? (
            <button className="btn btn-danger" onClick={() => setConfirming(true)}>
              <RotateCcw size={13} /> Reset demo data
            </button>
          ) : (
            <div className="row">
              <span className="small">Discard all events, reviews, tasks and drafted contracts and restore the seed?</span>
              <button className="btn btn-danger btn-sm" onClick={() => { resetDemoData(); setConfirming(false); nav("control"); }}>Yes, reset</button>
              <button className="btn btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <SectionHead title="What is real vs simulated" sub="An honest map of this prototype — real logic where you can test it, representative fixtures for expensive integrations." />
        <div className="grid g2">
          <div className="card">
            <div className="row" style={{ color: "var(--good)", marginBottom: 10 }}>
              <CheckCircle2 size={16} />
              <b className="small">Real (live behavior)</b>
            </div>
            <ul className="small dim" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
              <li>The decision engine: contracts, Safety Kernel, blast radius, context, envelopes</li>
              <li>State transitions: approvals, denials, park/resume, break-glass expiry</li>
              <li>Transformations: payloads genuinely change; tokens genuinely link to the vault</li>
              <li>Every counter and chart derives from the event store</li>
              <li>Policy changes genuinely change simulation outcomes</li>
              <li>Evidence chains built per-event with linked hashes</li>
            </ul>
          </div>
          <div className="card">
            <div className="row" style={{ color: "var(--warn)", marginBottom: 10 }}>
              <FlaskConical size={16} />
              <b className="small">Simulated (representative)</b>
            </div>
            <ul className="small dim" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7 }}>
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
