// Shared deck primitives: reveals, stats, sources, screenshot frames, autoplay
// code, logos. Presentation only — numbers and text come from the slides.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { logoUrl } from "../ui/logos";
import { research, type Claim } from "./data/research";

/* ---------- reveals ---------- */
const EASE = [0.16, 1, 0.3, 1] as const;

const SHOT = typeof document !== "undefined" && document.documentElement.dataset.shot === "1";
export function Reveal({ children, i = 0, y = 18, className, style, delay = 0 }: { children: React.ReactNode; i?: number; y?: number; className?: string; style?: React.CSSProperties; delay?: number }) {
  return (
    <motion.div className={className} style={style} initial={SHOT ? false : { opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.12 + i * 0.08 + delay }}>
      {children}
    </motion.div>
  );
}

/* ---------- text ---------- */
export const Eyebrow = ({ children }: { children: React.ReactNode }) => <div className="eyebrow">{children}</div>;
export const Display = ({ children, sm, className = "", style }: { children: React.ReactNode; sm?: boolean; className?: string; style?: React.CSSProperties }) => <h1 className={`display ${sm ? "sm" : ""} ${className}`} style={style}>{children}</h1>;
export const Lead = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => <p className="lead" style={style}>{children}</p>;

/* ---------- numbers ---------- */
export function CountUp({ to, decimals = 0, suffix = "", prefix = "", duration = 1.1, className, style }: { to: number; decimals?: number; suffix?: string; prefix?: string; duration?: number; className?: string; style?: React.CSSProperties }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0; const t0 = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / (duration * 1000)); const e = 1 - Math.pow(1 - p, 3); setV(to * e); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration, reduced]);
  return <span ref={ref} className={className} style={style}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
}

export function Stat({ value, label, sub, n, md, i = 0 }: { value: React.ReactNode; label: React.ReactNode; sub?: React.ReactNode; n?: number; md?: boolean; i?: number }) {
  return (
    <Reveal i={i} className="stat">
      <div className={`v ${md ? "md" : ""}`}>{value}{n !== undefined && <sup className="sup">{n}</sup>}</div>
      <div className="l">{label}</div>
      {sub && <div className="s">{sub}</div>}
    </Reveal>
  );
}

/* ---------- sources ---------- */
/** Publication strings from the corpus can carry notes ("accessed 2026-09 (page undated)"); show the date only. */
export function fmtDate(p: string): string {
  const m = p.match(/\d{4}-\d{2}(-\d{2})?/);
  if (m && !/accessed/i.test(p.slice(0, m.index))) return m[0];
  return /accessed/i.test(p) ? "accessed 2026-09" : p.slice(0, 12);
}
export function Sources({ ids, extra = [] }: { ids: string[]; extra?: { n: number; label: string; url?: string }[] }) {
  const org = (s: string) => (s.length > 34 ? s.slice(0, 32) + "…" : s);
  const items = ids.map((id, k) => { const c = claimById(id); return c ? { n: k + 1, label: `${org(c.source_org)} — ${c.source_title.length > 52 ? c.source_title.slice(0, 50) + "…" : c.source_title} (${fmtDate(c.published)})`, url: c.source_url } : null; }).filter(Boolean) as { n: number; label: string; url?: string }[];
  const all = [...items, ...extra];
  if (!all.length) return null;
  return (
    <div className="sources" aria-label="Sources">
      {all.map((s) => <span key={s.n}><b>{s.n}</b> {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label}</span>)}
    </div>
  );
}
export function claimById(id: string): Claim | undefined {
  for (const t of Object.values(research.topics)) { const c = t.claims.find((x) => x.id === id); if (c) return c; }
  return undefined;
}
export function claimsOf(topic: string): Claim[] { return research.topics[topic]?.claims ?? []; }

/* ---------- screenshots ---------- */
const shotFiles = import.meta.glob("./shots/*.jpg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const shotByName: Record<string, string> = {};
for (const [p, u] of Object.entries(shotFiles)) shotByName[p.split("/").pop()!.replace(/\.jpg$/, "")] = u;
export function shotUrl(name: string): string | undefined {
  const theme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  return shotByName[`${name}-${theme}`] ?? shotByName[`${name}-dark`] ?? shotByName[`${name}-light`];
}
let lightboxSetter: ((s: { src: string; cap: string } | null) => void) | null = null;
export function Lightbox() {
  const [s, set] = useState<{ src: string; cap: string } | null>(null);
  useEffect(() => { lightboxSetter = set; return () => { lightboxSetter = null; }; }, []);
  useEffect(() => { if (!s) return; const on = (e: KeyboardEvent) => { if (e.key === "Escape") set(null); }; window.addEventListener("keydown", on, true); return () => window.removeEventListener("keydown", on, true); }, [s]);
  if (!s) return null;
  return <div className="lightbox" onClick={() => set(null)} role="dialog" aria-label={s.cap}><img src={s.src} alt={s.cap} /><div className="cap">{s.cap} · Esc to close</div></div>;
}
export function Shot({ name, url, alt, fit, style, className = "" }: { name: string; url?: string; alt: string; fit?: boolean; style?: React.CSSProperties; className?: string }) {
  const [, force] = useState(0);
  useEffect(() => { const mo = new MutationObserver(() => force((n) => n + 1)); mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => mo.disconnect(); }, []);
  const src = shotUrl(name);
  return (
    <button type="button" className={`shot-btn ${className}`} style={style} onClick={() => src && lightboxSetter?.({ src, cap: alt })} aria-label={`Enlarge: ${alt}`}>
      <div className={`frame ${fit ? "fit" : ""}`} style={fit ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}>
        <div className="bar"><i /><i /><i /><span className="url">{url ?? `wrapbox.app/#${name}`}</span></div>
        {src ? <img src={src} alt={alt} style={fit ? { flex: 1, minHeight: 0 } : undefined} /> : <div style={{ padding: 40, color: "#8a8a8f", fontFamily: "var(--mono)", fontSize: 13 }}>screenshot: {name}</div>}
      </div>
    </button>
  );
}

/* ---------- logos ---------- */
export const Logo = ({ name, size = 20, style }: { name: string; size?: number; style?: React.CSSProperties }) => <img src={logoUrl(name)} alt="" width={size} height={size} style={{ borderRadius: Math.round(size / 4), background: "#fff", padding: Math.max(1, Math.round(size / 10)), ...style }} />;

/* ---------- autoplay code ---------- */
type Tok = { c: string; t?: string };
const KW = /\b(const|let|function|return|if|else|for|of|export|import|from|interface|type|switch|case|break|default|new|true|false|null|undefined|async|await|throw|in|as)\b/;
function tokenize(src: string, lang: string): Tok[] {
  const out: Tok[] = [];
  const re = lang === "yaml" || lang === "bash"
    ? /(#.*$)|("[^"]*"|'[^']*')|(^\s*[\w.-]+(?=:))|(\b\d+(?:\.\d+)?\b)|(\b(?:ALLOW|CONSTRAIN|REVIEW|BLOCK|true|false)\b)|([^\s#"']+|\s+)/gm
    : /(\/\/.*$|\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*'|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Z][A-Za-z0-9_]*\b)|([A-Za-z_$][\w$]*)(?=\()|([A-Za-z_$][\w$]*)|([{}()[\],;:.<>=+\-*/!?&|]+)|(\s+)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const s = m[0];
    if (lang === "yaml" || lang === "bash") {
      if (m[1]) out.push({ c: s, t: "c" }); else if (m[2]) out.push({ c: s, t: "s" }); else if (m[3]) out.push({ c: s, t: "t" }); else if (m[4]) out.push({ c: s, t: "n" }); else if (m[5]) out.push({ c: s, t: "k" }); else out.push({ c: s });
    } else {
      if (m[1]) out.push({ c: s, t: "c" }); else if (m[2]) out.push({ c: s, t: "s" }); else if (m[3]) out.push({ c: s, t: "n" }); else if (m[4]) out.push({ c: s, t: "t" }); else if (m[5]) out.push({ c: s, t: "f" }); else if (m[6]) out.push({ c: s, t: KW.test(s) ? "k" : undefined }); else if (m[7]) out.push({ c: s, t: "p" }); else out.push({ c: s });
    }
  }
  return out;
}
export function TypeCode({ code, lang = "ts", title, active = true, cps = 55, delay = 0.4, style, autoScroll = true }: { code: string; lang?: "ts" | "yaml" | "bash"; title?: string; active?: boolean; cps?: number; delay?: number; style?: React.CSSProperties; autoScroll?: boolean }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? code.length : 0);
  const pre = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (!active) return;
    if (reduced) { setN(code.length); return; }
    setN(0);
    let i = 0; let iv = 0;
    const t0 = window.setTimeout(() => {
      iv = window.setInterval(() => {
        i += 1 + (Math.random() < 0.35 ? 1 : 0);
        if (i >= code.length) { i = code.length; window.clearInterval(iv); }
        setN(i);
      }, 1000 / cps);
    }, delay * 1000);
    return () => { window.clearTimeout(t0); window.clearInterval(iv); };
  }, [code, active, cps, delay, reduced]);
  useEffect(() => { if (autoScroll && pre.current) pre.current.scrollTop = pre.current.scrollHeight; }, [n, autoScroll]);
  const toks = useMemo(() => tokenize(code.slice(0, n), lang), [code, n, lang]);
  return (
    <div className="code" style={style}>
      <div className="cbar"><span className="lights"><i /><i /><i /></span><span>{title ?? (lang === "yaml" ? "policy.yaml" : lang === "bash" ? "terminal" : "engine.ts")}</span></div>
      <pre ref={pre}>{toks.map((t, k) => t.t ? <span key={k} className={t.t}>{t.c}</span> : t.c)}{n < code.length && <span className="cursor" />}</pre>
    </div>
  );
}

/* ---------- misc ---------- */
export const Chip = ({ tone, children }: { tone: "allow" | "constrain" | "review" | "block" | "neutral"; children: React.ReactNode }) => <span className={`chip ${tone}`}>{children}</span>;
export const Pill = ({ children, acc, logo }: { children: React.ReactNode; acc?: boolean; logo?: string }) => <span className={`pill ${acc ? "acc" : ""}`}>{logo && <img src={logoUrl(logo)} alt="" />}{children}</span>;
export const decisionTone = (d: string) => (d === "ALLOW" ? "allow" : d === "CONSTRAIN" ? "constrain" : d === "REVIEW" ? "review" : "block") as "allow" | "constrain" | "review" | "block";
