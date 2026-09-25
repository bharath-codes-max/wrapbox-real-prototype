// Shared UI kit — decision chips, cards, tables, drawer, payload views.
import React from "react";
import type { Decision, SimulationEvent } from "../model/types";
import { agentById, resourceById, userById } from "../model/org";
import { destById } from "../model/registries";
import { AGENT_LOGOS, DEST_LOGOS, logoUrl, photoOf } from "./logos";

const AVATAR_COLORS = ["#1848ff", "#6b45e0", "#0a8a5c", "#b26500"];
export function Avatar({ userId, size = 22 }: { userId: string; size?: number }) {
  const u = userById(userId);
  const photo = photoOf(userId);
  if (photo) {
    return <img src={photo} alt={u?.name ?? userId} className="avatar" style={{ width: size, height: size, objectFit: "cover" }} />;
  }
  const initials = (u?.name ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("");
  const color = AVATAR_COLORS[(userId.charCodeAt(2) || 0) % AVATAR_COLORS.length];
  return <span className="avatar" style={{ width: size, height: size, background: color }}>{initials}</span>;
}

export function AgentMark({ agentId, size = 16 }: { agentId: string; size?: number }) {
  const mark = AGENT_LOGOS[agentId];
  if (!mark) return null;
  return <img src={logoUrl(mark)} alt="" className="logo-img" style={{ width: size, height: size }} />;
}

export function DestMark({ destId, size = 16 }: { destId: string; size?: number }) {
  const mark = DEST_LOGOS[destId];
  if (!mark) return null;
  return <img src={logoUrl(mark)} alt="" className="logo-img" style={{ width: size, height: size }} />;
}

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
  label, value, note, tone, onClick, icon,
}: { label: string; value: React.ReactNode; note?: string; tone?: string; onClick?: () => void; icon?: React.ReactNode }) {
  return (
    <div className={`card stat ${onClick ? "clickable" : ""}`} onClick={onClick}>
      {icon ? (
        <div className="stat-top">
          <div className="stat-label">{label}</div>
          <div className="stat-icon" style={tone ? { color: `var(--${tone})`, background: `var(--${tone}-soft)` } : undefined}>{icon}</div>
        </div>
      ) : (
        <div className="stat-label">{label}</div>
      )}
      <div className="stat-value" style={tone ? { color: `var(--${tone})` } : undefined}>{shownValue(value)}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

/** Integer that counts up to its value on first paint and eases between later values. */
const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
export function CountUp({ value }: { value: number }) {
  const animate = Number.isInteger(value) && !prefersReducedMotion();
  const [shown, setShown] = React.useState(animate ? 0 : value);
  const from = React.useRef(animate ? 0 : value);
  React.useEffect(() => {
    // Hidden tabs pause animation frames — show the real value straight away there.
    if (!animate || document.hidden) { setShown(value); from.current = value; return; }
    const a = from.current, b = value, start = performance.now(), dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      setShown(Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const settle = setTimeout(() => setShown(b), dur + 150); // always land on the true value
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); from.current = b; };
  }, [value, animate]);
  return <>{Number.isInteger(shown) ? shown.toLocaleString("en-US") : shown}</>;
}
const shownValue = (v: React.ReactNode) => (typeof v === "number" ? <CountUp value={v} /> : v);

export interface MetricItem { label: string; value: React.ReactNode; note?: string; tone?: string; onClick?: () => void }
/** Inline KPIs. `band` = borderless straight on the canvas; default = one carded strip. */
export function MetricBar({ items, band }: { items: MetricItem[]; band?: boolean }) {
  return (
    <div className={band ? "metricband" : "metricbar"}>
      {items.map((it, i) => (
        <div key={i} className={`metric ${it.onClick ? "clickable" : ""}`} onClick={it.onClick}>
          <div className="metric-top">
            <span className="metric-label">{it.label}</span>
            {it.tone && <span className="metric-dot" style={{ background: `var(--${it.tone})` }} />}
          </div>
          <span className="metric-value">{shownValue(it.value)}</span>
          {it.note && <span className="metric-note">{it.note}</span>}
        </div>
      ))}
    </div>
  );
}

/**
 * Page-level tabs — one section at a time instead of a long scroll. Only the
 * active tab's content mounts; page state lives in the page component, so it
 * survives tab switches. `storageKey` remembers the last tab for the session.
 */
export interface PageTab { id: string; label: string; count?: React.ReactNode; content: React.ReactNode }
export function PageTabs({ tabs, storageKey }: { tabs: PageTab[]; storageKey?: string }) {
  const [active, setActive] = React.useState<string>(() => {
    try {
      const saved = storageKey ? sessionStorage.getItem(`tab:${storageKey}`) : null;
      if (saved && tabs.some((t) => t.id === saved)) return saved;
    } catch { /* storage unavailable — default to the first tab */ }
    return tabs[0]?.id ?? "";
  });
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const pick = (id: string) => {
    setActive(id);
    try { if (storageKey) sessionStorage.setItem(`tab:${storageKey}`, id); } catch { /* ignore */ }
  };
  return (
    <div className="section page-tabs">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === current?.id} className={`tab ${t.id === current?.id ? "active" : ""}`} onClick={() => pick(t.id)}>
            {t.label}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={current?.id} className="tabpanel-anim">{current?.content}</div>
    </div>
  );
}

/** Client-side pagination for long lists; `resetKey` jumps back to page 1 when filters change. */
export function usePaged<T>(items: T[], size = 12, resetKey = "") {
  const [page, setPage] = React.useState(0);
  React.useEffect(() => { setPage(0); }, [resetKey]);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(page, pages - 1);
  return { rows: items.slice(p * size, p * size + size), page: p, pages, setPage, total: items.length, size };
}
export function Pager({ page, pages, setPage, total, size }: { page: number; pages: number; setPage: (p: number) => void; total: number; size: number }) {
  if (pages <= 1) return null;
  const start = page * size + 1;
  const end = Math.min(total, start + size - 1);
  return (
    <div className="pager">
      <span className="small faint tnum">{start}–{end} of {total}</span>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Previous</button>
        <span className="small dim tnum">Page {page + 1} of {pages}</span>
        <button className="btn btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next ›</button>
      </div>
    </div>
  );
}

export function PageHead({ title, sub, right, eyebrow }: { title: string; sub?: string; right?: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="page-head">
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div className="page-eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {right && <div className="row" style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

/** A titled section with optional action on the right. */
export function SectionHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <div className="section-title">{title}</div>
        {sub && <div className="section-sub">{sub}</div>}
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
