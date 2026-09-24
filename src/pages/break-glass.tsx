// Break Glass — explicit, time-limited, heavily evidenced emergency override.
import { useEffect, useState } from "react";
import { useAppState, startBreakGlass, endBreakGlass } from "../state/store";
import { PageHead, Chip, SimNote } from "../ui/kit";
import { USERS } from "../model/org";

export function BreakGlassPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("production checkout-service only");
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

  return (
    <div className="page">
      <PageHead
        title="Break Glass"
        sub="Emergency override for genuine incidents. Requires reason, scope and duration; always expires automatically; generates high-visibility evidence. Never permanent."
        right={<SimNote />}
      />

      {active ? (
        <div className="card" style={{ borderColor: "var(--bad)", background: "var(--bad-soft)" }}>
          <div className="spread">
            <b>⚠ BREAK-GLASS ACTIVE</b>
            <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{mm}:{ss}</span>
          </div>
          <dl className="kv" style={{ marginTop: 8 }}>
            <dt>Requester</dt><dd>{USERS.find((u) => u.id === active.requester)?.name}</dd>
            <dt>Reason</dt><dd>{active.reason}</dd>
            <dt>Scope</dt><dd>{active.scope}</dd>
            <dt>Duration</dt><dd>{active.durationMin} minutes · expires automatically</dd>
          </dl>
          <div className="small dim" style={{ margin: "8px 0" }}>
            While active, REVIEW/BLOCK decisions within scope are executed under emergency authority — except Safety Kernel
            credential-exfiltration, which never yields. Every overridden action is stamped BREAK-GLASS in Evidence.
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => endBreakGlass(active.id)}>End override now</button>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">Request emergency override</div>
          <div className="grid g2">
            <div className="field">
              <label className="field-label">Reason (required)</label>
              <input className="input" placeholder="e.g. SEV-1: checkout down, revenue impacting" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Scope</label>
              <input className="input" value={scope} onChange={(e) => setScope(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Duration (minutes, max 60)</label>
              <input className="input" type="number" min={5} max={60} value={duration} onChange={(e) => setDuration(Math.min(60, Number(e.target.value)))} />
            </div>
          </div>
          <div className="card" style={{ margin: "12px 0", borderColor: "var(--warn)" }}>
            <b className="small" style={{ color: "var(--warn)" }}>Strong warning:</b>{" "}
            <span className="small dim">
              break-glass bypasses review for in-scope actions. It is loud by design — the security team is notified,
              every action is flagged, and the override cannot be extended silently.
            </span>
          </div>
          <button className="btn btn-danger" disabled={reason.trim().length < 8} onClick={() => startBreakGlass("u-priya", reason, scope, duration)}>
            ⚠ Activate break-glass ({duration} min)
          </button>
          {reason.trim().length < 8 && <span className="small faint" style={{ marginLeft: 10 }}>A meaningful reason is required.</span>}
        </div>
      )}

      {s.breakGlass.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, margin: "20px 0 8px" }}>History</h2>
          <div className="card" style={{ padding: 0 }}>
            <table className="tbl">
              <thead><tr><th>When</th><th>Requester</th><th>Reason</th><th>Scope</th><th>Duration</th><th>Status</th></tr></thead>
              <tbody>
                {[...s.breakGlass].reverse().map((b) => (
                  <tr key={b.id}>
                    <td className="small">{new Date(b.startedAt).toLocaleString()}</td>
                    <td className="small">{USERS.find((u) => u.id === b.requester)?.name}</td>
                    <td className="small dim">{b.reason}</td>
                    <td className="small dim">{b.scope}</td>
                    <td className="small">{b.durationMin}m</td>
                    <td><Chip tone={b.active && b.startedAt + b.durationMin * 60000 > Date.now() ? "block" : "neutral"}>{b.active && b.startedAt + b.durationMin * 60000 > Date.now() ? "ACTIVE" : "expired"}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="small faint" style={{ marginTop: 6 }}>
            Overridden actions appear flagged in <a onClick={() => nav("evidence")}>Evidence</a>.
          </div>
        </>
      )}
    </div>
  );
}
