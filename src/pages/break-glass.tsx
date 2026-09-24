// Break Glass — explicit, time-limited, heavily evidenced emergency override.
import { useEffect, useState } from "react";
import { useAppState, startBreakGlass, endBreakGlass } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, SimNote } from "../ui/kit";
import { USERS, userById } from "../model/org";
import { describe } from "../ui/describe";
import type { BreakGlassSession, Environment } from "../model/types";

// What an emergency override can cover: exactly one system in one environment.
const SCOPES: { resource: string; environment: Environment; label: string }[] = [
  { resource: "r-checkout", environment: "production", label: "checkout-service — production branch (main)" },
  { resource: "r-aws-prod", environment: "production", label: "AWS Production" },
  { resource: "r-customer-db", environment: "production", label: "customer-db (production)" },
  { resource: "r-payments-prod", environment: "production", label: "payments-prod database" },
];
import { Siren, Timer, History, TriangleAlert, ShieldAlert, KeyRound } from "lucide-react";

export function BreakGlassPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [reason, setReason] = useState("");
  const [scopeIdx, setScopeIdx] = useState(0);
  const [duration, setDuration] = useState(20);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const active = s.breakGlass.find((b) => b.active && b.startedAt + b.durationMin * 60000 > Date.now());
  const remaining = active ? Math.max(0, active.startedAt + active.durationMin * 60000 - Date.now()) : 0;
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  const activeNow = s.breakGlass.filter((b) => b.active && b.startedAt + b.durationMin * 60000 > Date.now()).length;
  const lifetime = s.breakGlass.length;
  const expired = lifetime - activeNow;
  // The actions a session actually overrode (stamped only when it changed the outcome).
  const overriddenBy = (b: BreakGlassSession) =>
    s.events.filter((e) => e.breakGlass && e.timestamp >= b.startedAt && e.timestamp <= b.startedAt + b.durationMin * 60000
      && e.resource === b.scopeResource && e.environment === b.scopeEnvironment);

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Break Glass"
        sub="An emergency override for a real incident. It covers exactly one system, lasts at most 60 minutes, is recorded loudly, and never overrides the Safety Kernel."
        right={<SimNote />}
      />

      <div className="grid g3">
        <Stat
          icon={<Siren size={17} />}
          label="Active overrides"
          value={activeNow}
          tone={activeNow > 0 ? "bad" : "good"}
          note={activeNow > 0 ? "emergency authority in effect" : "no override in effect"}
        />
        <Stat
          icon={<History size={17} />}
          label="Lifetime activations"
          value={lifetime}
          note="every activation is retained"
        />
        <Stat
          icon={<KeyRound size={17} />}
          label="Expired"
          value={expired}
          tone="good"
          note="expired or ended early"
        />
      </div>

      {active ? (
        <div className="section">
          <SectionHead title="Live override" sub="Emergency authority is in effect and counting down" />
          <div className="card" style={{ borderColor: "var(--bad)", background: "var(--bad-soft)" }}>
            <div className="spread">
              <div className="row" style={{ gap: 8, alignItems: "center" }}>
                <Siren size={18} style={{ color: "var(--bad)" }} />
                <b style={{ color: "var(--bad)", letterSpacing: "0.02em" }}>BREAK-GLASS ACTIVE</b>
              </div>
              <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--bad)", letterSpacing: "-0.02em" }}>{mm}:{ss}</span>
            </div>
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt>Requester</dt><dd>{USERS.find((u) => u.id === active.requester)?.name}</dd>
              <dt>Reason</dt><dd>{active.reason}</dd>
              <dt>Covers only</dt><dd>{active.scope}</dd>
              <dt>Duration</dt><dd>{active.durationMin} minutes · ends by itself</dd>
              <dt>Notified</dt>
              <dd>
                {(active.notified ?? []).map((u) => `${userById(u)?.name} (${userById(u)?.role})`).join(", ") || "—"}
                <div className="small faint">Recorded here; no real message is sent in this prototype.</div>
              </dd>
            </dl>
            <div className="small dim" style={{ margin: "16px 0", lineHeight: 1.6 }}>
              While this is on, actions on <b>{active.scope}</b> that would need a yes (or are blocked by a company rule) go through —
              and each one is stamped BREAK-GLASS in Evidence. Everything else is unchanged, and the Safety Kernel never yields.
            </div>
            {overriddenBy(active).length > 0 && (
              <div className="small" style={{ marginBottom: 16 }}>
                <b>Done under this override ({overriddenBy(active).length}):</b>
                {overriddenBy(active).map((e) => <div key={e.id} className="dim" style={{ marginTop: 4 }}>• {describe(e)}</div>)}
              </div>
            )}
            <div className="row" style={{ gap: 12 }}>
              <button className="btn btn-danger btn-sm" onClick={() => endBreakGlass(active.id)}>End override now</button>
              {overriddenBy(active).length > 0 && (
                <span className="small dim">
                  Fixed? End it now — until then, {active.scope} keeps skipping approvals.
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="section">
          <SectionHead title="Request emergency override" sub="Scoped, time-boxed and loud by design" />
          <div className="card">
            <div className="grid g2">
              <div className="field">
                <label className="field-label">Reason (required)</label>
                <input className="input" placeholder="e.g. SEV-1: checkout down, revenue impacting" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Covers only (one system)</label>
                <select className="select" value={scopeIdx} onChange={(e) => setScopeIdx(Number(e.target.value))}>
                  {SCOPES.map((sc, i) => <option key={sc.label} value={i}>{sc.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Duration (minutes, max 60)</label>
                <input className="input" type="number" min={5} max={60} value={duration} onChange={(e) => setDuration(Math.min(60, Number(e.target.value)))} />
              </div>
            </div>
            <div className="card" style={{ marginTop: 16, borderColor: "var(--warn)", background: "var(--warn-soft)" }}>
              <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
                <TriangleAlert size={16} style={{ color: "var(--warn)", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <b className="small" style={{ color: "var(--warn)" }}>Strong warning:</b>{" "}
                  <span className="small dim">
                    for the next {duration} minutes, actions on the chosen system that would need a yes or hit a company block go through. Security and engineering
                    leadership are notified, every action it overrides is flagged in Evidence, it can't be extended, and the
                    Safety Kernel still applies.
                  </span>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 10, alignItems: "center", marginTop: 16 }}>
              <button className="btn btn-danger" disabled={reason.trim().length < 8} onClick={() => startBreakGlass("u-priya", reason, SCOPES[scopeIdx].resource, SCOPES[scopeIdx].environment, SCOPES[scopeIdx].label, duration)}>
                <ShieldAlert size={13} /> Activate break-glass ({duration} min)
              </button>
              {reason.trim().length < 8 && <span className="small faint">A meaningful reason is required.</span>}
            </div>
          </div>
        </div>
      )}

      {s.breakGlass.length > 0 ? (
        <div className="section">
          <SectionHead
            title="History"
            sub="Every activation is retained and reflected in Evidence"
            right={<button className="btn btn-sm" onClick={() => nav("evidence")}>View in Evidence</button>}
          />
          <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>When</th><th>Requester</th><th>Reason</th><th>Covered</th><th>Duration</th><th>Overrode</th><th>Status</th></tr></thead>
              <tbody>
                {[...s.breakGlass].reverse().map((b) => {
                  const isActive = b.active && b.startedAt + b.durationMin * 60000 > Date.now();
                  return (
                    <tr key={b.id}>
                      <td className="small">{new Date(b.startedAt).toLocaleString()}</td>
                      <td className="small">{USERS.find((u) => u.id === b.requester)?.name}</td>
                      <td className="small dim">{b.reason}</td>
                      <td className="small dim">{b.scope}</td>
                      <td className="small">{b.durationMin}m</td>
                      <td className="small">{overriddenBy(b).length} action{overriddenBy(b).length === 1 ? "" : "s"}</td>
                      <td><Chip tone={isActive ? "block" : "neutral"}>{isActive ? "ACTIVE" : b.active ? "expired" : "ended"}</Chip></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="section">
          <div className="empty">
            <Timer size={22} className="dim" />
            <div style={{ marginTop: 8 }}>No break-glass has ever been activated.</div>
            <div className="small faint" style={{ marginTop: 4 }}>Activations appear here and are flagged in <a onClick={() => nav("evidence")}>Evidence</a>.</div>
          </div>
        </div>
      )}
    </div>
  );
}
