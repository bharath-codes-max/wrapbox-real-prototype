// Break Glass — explicit, time-limited, heavily evidenced emergency override.
import { useEffect, useState } from "react";
import { useAppState, startBreakGlass, endBreakGlass } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, SimNote } from "../ui/kit";
import { USERS } from "../model/org";
import { Siren, Timer, History, TriangleAlert, ShieldAlert, KeyRound } from "lucide-react";

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

  const activeNow = s.breakGlass.filter((b) => b.active && b.startedAt + b.durationMin * 60000 > Date.now()).length;
  const lifetime = s.breakGlass.length;
  const expired = lifetime - activeNow;

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Break Glass"
        sub="Emergency override for genuine incidents. Requires reason, scope and duration; always expires automatically; generates high-visibility evidence. Never permanent."
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
          note="auto-expired, no manual reset"
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
              <dt>Scope</dt><dd>{active.scope}</dd>
              <dt>Duration</dt><dd>{active.durationMin} minutes · expires automatically</dd>
            </dl>
            <div className="small dim" style={{ margin: "16px 0", lineHeight: 1.6 }}>
              While active, REVIEW/BLOCK decisions within scope are executed under emergency authority — except Safety Kernel
              credential-exfiltration, which never yields. Every overridden action is stamped BREAK-GLASS in Evidence.
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => endBreakGlass(active.id)}>End override now</button>
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
                <label className="field-label">Scope</label>
                <input className="input" value={scope} onChange={(e) => setScope(e.target.value)} />
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
                    break-glass bypasses review for in-scope actions. It is loud by design — the security team is notified,
                    every action is flagged, and the override cannot be extended silently.
                  </span>
                </div>
              </div>
            </div>
            <div className="row" style={{ gap: 10, alignItems: "center", marginTop: 16 }}>
              <button className="btn btn-danger" disabled={reason.trim().length < 8} onClick={() => startBreakGlass("u-priya", reason, scope, duration)}>
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
              <thead><tr><th>When</th><th>Requester</th><th>Reason</th><th>Scope</th><th>Duration</th><th>Status</th></tr></thead>
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
                      <td><Chip tone={isActive ? "block" : "neutral"}>{isActive ? "ACTIVE" : "expired"}</Chip></td>
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
