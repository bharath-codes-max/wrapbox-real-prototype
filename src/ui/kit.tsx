// Shared UI kit — decision chips, cards, tables, drawer, payload views.
import React from "react";
import type { Decision, SimulationEvent } from "../model/types";
import { agentById, resourceById, userById } from "../model/org";
import { destById } from "../model/registries";

export function DecisionChip({ d, small }: { d: Decision | string; small?: boolean }) {
  const cls =
    d === "ALLOW" ? "c-allow" : d === "CONSTRAIN" ? "c-constrain" :
    d === "REVIEW" ? "c-review" : d === "BLOCK" ? "c-block" : "c-neutral";
  return (
    <span className={`chip ${cls}`} style={small ? { fontSize: 9.5 } : undefined}>
      <span className="chip-dot" />
      {d}
    </span>
  );
}

export function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`chip c-${tone}`}>{children}</span>;
}

export function StatusChip({ s }: { s: string }) {
  return <span className={`chip c-${s.toLowerCase()}`}>{s.replaceAll("_", " ")}</span>;
}

export function Stat({
  label, value, note, tone, onClick,
}: { label: string; value: React.ReactNode; note?: string; tone?: string; onClick?: () => void }) {
  return (
    <div className={`card stat ${onClick ? "clickable" : ""}`} onClick={onClick}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {right && <div className="row">{right}</div>}
    </div>
  );
}

export function Drawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="drawer-veil" onClick={onClose} />
      <div className="drawer" role="dialog">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕ Close</button>
        </div>
        {children}
      </div>
    </>
  );
}

export function SimNote({ children }: { children?: React.ReactNode }) {
  return <span className="sim-note">◇ {children ?? "Simulation — prototype data"}</span>;
}

export function names(e: SimulationEvent) {
  return {
    user: userById(e.user)?.name ?? e.user,
    agent: agentById(e.agent)?.name ?? e.agent,
    resource: resourceById(e.resource)?.name ?? e.resource,
    destination: e.destination ? destById(e.destination)?.label ?? e.destination : undefined,
  };
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
}

// Payload view highlighting tokens/redactions.
export function Payload({ title, text, highlight }: { title: string; text: string; highlight?: "tokens" | "sensitive" }) {
  let content: React.ReactNode = text;
  if (highlight === "tokens") {
    const parts = text.split(/((?:[A-Z]+_TOKEN_\d{3})|(?:\[REDACTED:[A-Z_]+\]))/g);
    content = parts.map((p, i) =>
      /^[A-Z]+_TOKEN_\d{3}$|^\[REDACTED:/.test(p) ? <span key={i} className="hl-tok">{p}</span> : p
    );
  } else if (highlight === "sensitive") {
    const re = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\+1 \d{3} \d{3} \d{4}|sk_live_\w+|-----BEGIN [A-Z ]+-----|VRD-CUST-\d{4}|ACCT-\d{8}|DB_PASSWORD=\S+)/g;
    const parts = text.split(re);
    content = parts.map((p, i) => (re.test(p) && i % 2 === 1 ? <span key={i} className="hl-red">{p}</span> : p));
  }
  return (
    <div>
      <div className="payload-title dim">{title}</div>
      <div className="payload">{content}</div>
    </div>
  );
}

export function EvidenceChain({ e }: { e: SimulationEvent }) {
  return (
    <div className="pipe">
      {e.evidence.chain.map((c, i) => (
        <div className="pipe-stage" key={i} style={{ animationDelay: `${i * 0.03}s` }}>
          <div className="pipe-rail">
            <div className={`pipe-dot ${c.label === "Decision" ? (e.decision === "ALLOW" ? "t-good" : e.decision === "BLOCK" ? "t-bad" : e.decision === "REVIEW" ? "t-warn" : "t-info") : "t-neutral"}`} />
            {i < e.evidence.chain.length - 1 && <div className="pipe-line" />}
          </div>
          <div className="pipe-body">
            <div className="pipe-label">{c.label}</div>
            <div className="pipe-detail">{c.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RiskChip({ r }: { r: string }) {
  return <span className={`chip c-${r}`}>{r.toUpperCase()}</span>;
}
