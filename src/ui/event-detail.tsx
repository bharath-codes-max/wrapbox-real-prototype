// Shared event detail drawer — the single inspection view every screen opens.
import { Drawer, DecisionChip, Payload, EvidenceChain, names, RiskChip, StatusChip, Chip } from "./kit";
import type { SimulationEvent } from "../model/types";
import { resolveReview } from "../state/store";
import { deviceById } from "../model/org";

export function EventDetail({ e, onClose, onNavigate }: {
  e: SimulationEvent;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}) {
  const n = names(e);
  const pending = e.reviewState?.status === "pending";
  return (
    <Drawer onClose={onClose}>
      <div className="spread" style={{ marginBottom: 6 }}>
        <h2 style={{ fontSize: 16 }}>{e.action} · {n.resource}</h2>
        <DecisionChip d={e.decision} />
      </div>
      <div className="row small dim" style={{ marginBottom: 12 }}>
        <span className="mono">{e.id}</span>
        <span>·</span>
        <span>{new Date(e.timestamp).toLocaleString()}</span>
        <span>·</span>
        <RiskChip r={e.risk} />
        {e.breakGlass && <Chip tone="critical">BREAK-GLASS</Chip>}
      </div>

      <dl className="kv">
        <dt>User</dt><dd>{n.user}</dd>
        <dt>Device</dt><dd>{deviceById(e.device)?.name ?? e.device}</dd>
        <dt>Agent</dt><dd>{onNavigate ? <a onClick={() => onNavigate("agents")}>{n.agent}</a> : n.agent}</dd>
        {e.application && <><dt>Tool</dt><dd>{e.application}</dd></>}
        <dt>Plane</dt><dd>{e.plane}</dd>
        <dt>Action</dt><dd className="mono">{e.actionRaw ?? e.action} <span className="faint">→ {e.action}</span></dd>
        <dt>Environment</dt><dd>{e.environment}</dd>
        {n.destination && <><dt>Destination</dt><dd>{n.destination} <Chip tone="neutral">{e.destinationClass}</Chip></dd></>}
        {e.dataClasses.length > 0 && (
          <><dt>Data classes</dt><dd className="row">{e.dataClasses.map((c) => <Chip key={c} tone="violet">{c}</Chip>)}</dd></>
        )}
        {e.blastRadius && <><dt>Blast radius</dt><dd>{e.blastRadius.label} <Chip tone={e.blastRadius.severity}>{e.blastRadius.severity}</Chip></dd></>}
        <dt>Capability</dt><dd><StatusChip s={e.capabilityState} /></dd>
      </dl>

      <hr className="divider" />
      <h3 style={{ fontSize: 13, marginBottom: 6 }}>Why</h3>
      <ul style={{ margin: 0, paddingLeft: 18 }} className="small">
        {e.decisionReasons.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}
      </ul>
      {e.safeAlternative && (
        <div className="card" style={{ marginTop: 10, borderColor: "var(--border-strong)", background: "var(--bg-inset)" }}>
          <span className="small"><b>Safe alternative:</b> {e.safeAlternative}</span>
        </div>
      )}

      {e.inspection && e.inspection.inspectable && e.inspection.findings.length > 0 && (
        <>
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Detector findings <span className="faint small">({e.inspection.parser})</span></h3>
          <table className="tbl">
            <thead><tr><th>Data class</th><th>Detector</th><th>Conf.</th><th>Count</th><th>Sample</th></tr></thead>
            <tbody>
              {e.inspection.findings.map((f) => (
                <tr key={f.dataClass}>
                  <td><Chip tone="violet">{f.dataClass}</Chip></td>
                  <td className="mono small">{f.detector} v{f.detectorVersion}</td>
                  <td className="mono">{f.confidence.toFixed(2)}</td>
                  <td className="mono">{f.count.toLocaleString()}</td>
                  <td className="mono small dim">{f.sample}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {e.inspection && !e.inspection.inspectable && (
        <>
          <hr className="divider" />
          <div className="card" style={{ borderColor: "var(--bad)", background: "var(--bad-soft)" }}>
            <b className="small">UNINSPECTABLE</b>
            <div className="small dim">{e.inspection.reason}. Inability to inspect is never treated as clean — protected requirements fail closed.</div>
          </div>
        </>
      )}

      {e.payloadBefore && (
        <>
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>
            {e.payloadAfter ? "Original vs what left the device" : e.decision === "BLOCK" ? "Original (never transmitted)" : "Payload"}
          </h3>
          <div className="grid" style={{ gridTemplateColumns: e.payloadAfter ? "1fr" : "1fr" }}>
            <Payload title="ORIGINAL" text={e.payloadBefore} highlight="sensitive" />
            {e.payloadAfter && <Payload title="WHAT LEFT THE DEVICE" text={e.payloadAfter} highlight="tokens" />}
            {!e.payloadAfter && e.decision === "BLOCK" && (
              <div className="small" style={{ color: "var(--bad)", fontWeight: 600 }}>
                ⛔ Blocked before transmission — the destination did not receive this content.
              </div>
            )}
          </div>
        </>
      )}

      {e.transformation && e.transformation.length > 0 && (
        <>
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Transformations ({e.transformation[0].kind})</h3>
          <table className="tbl">
            <thead><tr><th>Class</th><th>Before</th><th>After</th></tr></thead>
            <tbody>
              {e.transformation.map((t, i) => (
                <tr key={i}>
                  <td className="small">{t.dataClass}</td>
                  <td className="mono small">{t.before}</td>
                  <td className="mono small"><span className="hl-tok">{t.after}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {e.transformation.some((t) => t.tokenId) && onNavigate && (
            <div className="small dim" style={{ marginTop: 6 }}>
              Reversible tokens stored in <a onClick={() => onNavigate("vault")}>Token Vault</a> — authorized restoration only.
            </div>
          )}
        </>
      )}

      {e.reviewState && (
        <>
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Review</h3>
          {pending ? (
            <>
              <div className="small dim" style={{ marginBottom: 8 }}>
                Pending approval · expires {new Date(e.reviewState.expiresAt).toLocaleTimeString()} · requester is separated from approver.
              </div>
              <div className="row">
                <button className="btn btn-good btn-sm" onClick={() => resolveReview(e.id, "approved", "u-alex", "Approved once")}>Approve once</button>
                <button className="btn btn-sm" onClick={() => resolveReview(e.id, "approved_scoped", "u-alex", "Scoped approval", "This resource only · 4h")}>Approve scoped</button>
                <button className="btn btn-warn btn-sm" onClick={() => resolveReview(e.id, "constrained", "u-alex", "Constrained to safe alternative")}>Constrain</button>
                <button className="btn btn-danger btn-sm" onClick={() => resolveReview(e.id, "denied", "u-alex", "Denied")}>Deny</button>
              </div>
            </>
          ) : (
            <dl className="kv">
              <dt>Outcome</dt><dd><StatusChip s={e.reviewState.status} /></dd>
              {e.reviewState.reviewer && <><dt>Reviewer</dt><dd>{e.reviewState.reviewer === "u-alex" ? "Alex Morgan" : e.reviewState.reviewer === "u-maya" ? "Maya Chen" : e.reviewState.reviewer}</dd></>}
              {e.reviewState.scope && <><dt>Scope</dt><dd>{e.reviewState.scope}</dd></>}
              {e.reviewState.note && <><dt>Note</dt><dd>{e.reviewState.note}</dd></>}
            </dl>
          )}
        </>
      )}

      {e.matchedContracts.length > 0 && (
        <>
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Matched Intent Contract clauses</h3>
          {e.matchedContracts.map((m) => (
            <div key={m.clauseId} className="card" style={{ marginBottom: 8, padding: "9px 12px" }}>
              <div className="small">“{m.clauseText}”</div>
              <div className="small faint" style={{ marginTop: 2 }}>
                {onNavigate ? <a onClick={() => onNavigate("intent")}>{m.contractName}</a> : m.contractName} · {m.clauseId}
              </div>
            </div>
          ))}
        </>
      )}
      {e.safetyRules.length > 0 && (
        <>
          <hr className="divider" />
          <h3 style={{ fontSize: 13, marginBottom: 8 }}>Safety Kernel</h3>
          {e.safetyRules.map((s) => (
            <div key={s.ruleId} className="card" style={{ marginBottom: 8, padding: "9px 12px", borderColor: "var(--bad)" }}>
              <b className="small">{s.name}</b>
              <div className="small dim">{s.description}</div>
              <div className="small faint" style={{ marginTop: 2 }}>Protected by Wrapbox baseline safety — no Intent Contract required.</div>
            </div>
          ))}
        </>
      )}

      <hr className="divider" />
      <h3 style={{ fontSize: 13, marginBottom: 8 }}>Evidence chain <span className="faint small mono">hash {e.evidence.hash} ← {e.evidence.prevHash}</span></h3>
      <EvidenceChain e={e} />
    </Drawer>
  );
}
