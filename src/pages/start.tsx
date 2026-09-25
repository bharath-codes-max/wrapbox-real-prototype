// Get started hub — the front door. Two ways in (set up a fresh workspace as
// the admin, or explore the Veridian demo), the employee side, and a setup
// checklist for the CURRENT workspace. Every state, count and decision on this
// page is read from the store; the decision ticker replays real recorded
// events and shows nothing when the workspace has none.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, Building2, Check, Plus, Radio, RotateCcw } from "lucide-react";
import {
  useAppState, metrics, switchWorkspace, startFreshWorkspace,
  type AppState, type Region,
} from "../state/store";
import { AGENTS, agentById, userById } from "../model/org";
import { ROLLOUT } from "../model/rollout";
import type { SimulationEvent } from "../model/types";
import { AgentMark, Avatar, Chip, DecisionChip, timeAgo } from "../ui/kit";
import { describe } from "../ui/describe";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const reducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

const REGION: Record<Region, string> = { us: "US", eu: "EU", in: "India" };
const AGENT_KINDS = [...new Set(AGENTS.map((a) => a.kind))];
const EMPLOYEE_ID = "u-daniel";
const EMPLOYEE_AGENT = AGENTS.find((a) => a.owner === EMPLOYEE_ID);

/** Vendor marks are drawn for a light tile (some are single-colour black), so
 *  their tile stays light in both themes — like an app icon. */
const LOGO_TILE = "color-mix(in oklab, var(--accent-fg) 95%, var(--accent))";

const ellipsis: CSSProperties ={ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** Mouse parallax: layers move by `px` × the pointer offset (--mx/--my, −1…1) set on the hero. */
const depth = (px: number): CSSProperties => ({
  transform: `translate3d(calc(var(--mx, 0) * ${px}px), calc(var(--my, 0) * ${px}px), 0)`,
  transition: "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
  willChange: "transform",
});

// ---------------------------------------------------------------------------
// Setup checklist — eight milestones, each derived from the current workspace
// ---------------------------------------------------------------------------

interface ChecklistItem { label: string; done: boolean; route: string; hint: string }

function checklist(s: AppState): ChecklistItem[] {
  const ob = s.onboarding;
  const active = s.contracts.filter((c) => c.status === "ACTIVE");
  const drafts = s.contracts.filter((c) => c.status === "DRAFT").length;
  const rules = active.reduce((n, c) => n + c.clauses.length, 0);
  const approved = s.events.filter((e) => e.reviewState?.status === "approved" || e.reviewState?.status === "approved_scoped").length;
  const waiting = s.events.filter((e) => e.reviewState?.status === "pending").length;
  const created = !!s.org.keyThumb || s.workspace === "demo";
  const employee = userById(EMPLOYEE_ID)?.name ?? "The employee";
  return [
    {
      label: "Create the workspace", done: created, route: "onboarding/admin",
      hint: created ? `${s.org.domain} · ${s.org.idp || "no SSO yet"} · ${REGION[s.org.region]} data region` : "SSO, company name, data region",
    },
    {
      label: "Choose agents to govern", done: ob.categories.length > 0, route: "onboarding/admin",
      hint: ob.categories.length > 0 ? `${ob.categories.length} of ${AGENT_KINDS.length} agent kinds governed` : "No agents chosen yet",
    },
    {
      label: "Publish your intent contract", done: active.length > 0, route: "intent",
      hint: active.length > 0
        ? `${plural(active.length, "contract")} active · ${plural(rules, "rule")} enforced`
        : drafts > 0 ? `${plural(drafts, "draft")} — none active yet` : "No contract yet — only the Safety Kernel applies",
    },
    {
      label: "Connect a runtime or gateway", done: ob.connected.length > 0, route: "integrations",
      hint: `${ob.connected.length} of ${ROLLOUT.length} connected`,
    },
    {
      label: "See the first decision", done: s.events.length > 0, route: "live",
      hint: s.events.length > 0 ? `${plural(s.events.length, "decision")} recorded` : "No decisions recorded yet",
    },
    {
      label: "Bring in your team", done: ob.invited.length > 1, route: "onboarding/admin",
      hint: ob.invited.length > 1 ? `${plural(ob.invited.length, "person", "people")} in the workspace` : ob.invited.length === 1 ? "Just you so far" : "No one invited yet",
    },
    {
      label: "An employee joins", done: ob.employeeDone, route: "onboarding/employee",
      hint: ob.employeeDone ? `${employee} joined`
        : ob.employee.installed ? `${employee} installed — finishing up`
        : ob.employee.accepted ? `${employee} accepted the invite`
        : "No one has joined yet",
    },
    {
      label: "First human approval", done: approved > 0, route: "reviews",
      hint: approved > 0
        ? `${plural(approved, "approval")}${waiting > 0 ? ` · ${waiting} waiting` : ""}`
        : waiting > 0 ? `${waiting} waiting for a human` : "Nothing has needed a human yet",
    },
  ];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function StartPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = metrics(s);
  const ob = s.onboarding;
  const fresh = s.workspace === "fresh";
  const company = s.org.company || "New workspace";
  const [confirmReset, setConfirmReset] = useState(false);

  const items = useMemo(() => checklist(s), [s]);
  const done = items.filter((i) => i.done).length;
  const next = items.find((i) => !i.done);
  const pct = Math.round((done / items.length) * 100);
  const activeRules = s.contracts.filter((c) => c.status === "ACTIVE").reduce((n, c) => n + c.clauses.length, 0);

  // "In progress" = the admin has committed something in this workspace.
  const progress = !!s.org.keyThumb || ob.categories.length > 0 || s.contracts.length > 0;
  const erasable = progress || ob.adminDone || ob.connected.length > 0 || ob.invited.length > 1 || s.events.length > 0;

  const adminTag = !fresh ? { text: "Fresh workspace · day one", tone: "neutral" }
    : ob.adminDone ? { text: "Done", tone: "allow" }
    : progress ? { text: "In progress", tone: "review" }
    : { text: "Fresh workspace · day one", tone: "neutral" };
  const adminCta = !fresh ? "Set up from zero" : ob.adminDone ? "Review setup" : progress ? "Resume admin setup" : "Start admin setup";
  const employeeTag = ob.employeeDone ? { text: "Done", tone: "allow" }
    : ob.employee.accepted ? { text: "In progress", tone: "review" }
    : { text: `In ${company}`, tone: "neutral" };

  const setUp = () => {
    if (!fresh) switchWorkspace("fresh");
    nav("onboarding/admin");
  };
  const explore = () => {
    switchWorkspace("demo"); // no-op when already in the demo
    nav("control");
  };
  const startOver = () => {
    startFreshWorkspace();
    // The admin wizard remembers its step per workspace for the session; a
    // workspace that was just erased must open at step 1, not where it was.
    try { sessionStorage.removeItem("wrapbox-onboarding-admin:fresh"); } catch { /* session-only */ }
    setConfirmReset(false);
    nav("onboarding/admin");
  };

  // Mouse parallax — CSS variables only, no re-render per mouse move.
  const onHeroMove = (e: MouseEvent<HTMLElement>) => {
    if (reducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    e.currentTarget.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const onHeroLeave = (e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--mx", "0");
    e.currentTarget.style.setProperty("--my", "0");
  };

  const governs = AGENTS.filter((a) => !a.discovered && a.kind !== "internal");

  return (
    <div className="page page-wide">
      {/* 1 · Hero ------------------------------------------------------- */}
      <section
        className="card"
        onMouseMove={onHeroMove}
        onMouseLeave={onHeroLeave}
        style={{
          position: "relative", overflow: "hidden", isolation: "isolate",
          padding: "clamp(24px, 3.4vw, 44px)", borderRadius: "var(--r-xl)",
          border: "1px solid color-mix(in oklab, var(--accent) 16%, var(--line))",
          boxShadow: "var(--shadow-md)",
          background:
            "linear-gradient(155deg, color-mix(in oklab, var(--accent-soft) 75%, var(--surface)) 0%, var(--surface) 52%, color-mix(in oklab, var(--constrain-soft) 70%, var(--surface)) 100%)",
        }}
      >
        {/* Decorative depth layers */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: -48, zIndex: 0, pointerEvents: "none", ...depth(-14),
          background:
            "radial-gradient(560px 360px at 6% 0%, color-mix(in oklab, var(--accent) 24%, transparent), transparent 70%)," +
            "radial-gradient(520px 380px at 96% 104%, color-mix(in oklab, var(--constrain) 22%, transparent), transparent 70%)",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", inset: -48, zIndex: 0, pointerEvents: "none", ...depth(-6),
          backgroundImage: "radial-gradient(color-mix(in oklab, var(--fg) 13%, transparent) 1px, transparent 1.6px)",
          backgroundSize: "20px 20px",
          maskImage: "radial-gradient(ellipse 48% 62% at 26% 42%, black, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 48% 62% at 26% 42%, black, transparent 78%)",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", inset: -48, zIndex: 0, pointerEvents: "none", ...depth(18),
          background: "repeating-radial-gradient(circle at 80% 52%, transparent 0 62px, color-mix(in oklab, var(--accent) 20%, transparent) 62px 63px)",
          maskImage: "radial-gradient(circle at 80% 52%, black 0, transparent 330px)",
          WebkitMaskImage: "radial-gradient(circle at 80% 52%, black 0, transparent 330px)",
        }} />
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "radial-gradient(420px circle at calc((var(--mx, 0) + 1) * 50%) calc((var(--my, 0) + 1) * 50%), color-mix(in oklab, var(--accent) 9%, transparent), transparent 70%)",
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px 40px" }}>
          <div style={{ flex: "1.15 1 420px", minWidth: 0, ...depth(-3) }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px 5px 10px", borderRadius: 999,
              fontSize: 12, fontWeight: 600, color: "var(--fg-2)",
              background: "color-mix(in oklab, var(--surface) 70%, transparent)",
              border: "1px solid color-mix(in oklab, var(--accent) 26%, transparent)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--accent)", boxShadow: "0 0 0 3px color-mix(in oklab, var(--accent) 22%, transparent)" }} />
              Runtime authorization for AI agents
            </span>
            <h1 style={{ fontSize: "clamp(34px, 3.9vw, 52px)", lineHeight: 1.03, letterSpacing: "-0.04em", fontWeight: 700, margin: "20px 0 0" }}>
              Put every AI agent on a{" "}
              <span style={{
                background: "linear-gradient(95deg, var(--accent) 10%, color-mix(in oklab, var(--accent) 45%, var(--constrain)) 100%)",
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              }}>permit</span>.
            </h1>
            <p style={{ margin: "16px 0 0", fontSize: 15.5, lineHeight: 1.6, color: "var(--fg-2)", maxWidth: "54ch" }}>
              Claude Code, Codex, ChatGPT, your own agents — every consequential action checked before it runs.
            </p>
            <div className="row" style={{ gap: 10, marginTop: 26 }}>
              <button className="btn btn-primary btn-lg" onClick={setUp}>
                {fresh && ob.adminDone ? <Check size={15} /> : <Plus size={15} />}
                {fresh ? adminCta : "Set up from zero"}
              </button>
              <button className="btn btn-lg" onClick={explore} style={{ background: "color-mix(in oklab, var(--surface) 78%, transparent)" }}>
                Explore the Veridian demo <ArrowRight size={15} />
              </button>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 22 }}>
              <span className="small faint">Governs</span>
              <span style={{ display: "inline-flex" }}>
                {governs.map((a, i) => (
                  <span key={a.id} title={a.name} style={{
                    width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center",
                    background: LOGO_TILE, border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)",
                    marginLeft: i === 0 ? 0 : -6, position: "relative", zIndex: governs.length - i,
                  }}>
                    <AgentMark agentId={a.id} size={16} />
                  </span>
                ))}
              </span>
              <span className="small faint">and your own agents</span>
            </div>
          </div>

          <DecisionPanel events={s.events} total={m.total} company={company} nav={nav} />
        </div>
      </section>

      {/* 2 · Paths ------------------------------------------------------ */}
      <div className="grid g3" style={{ marginTop: 16 }}>
        <PathCard
          icon={<IconTile><Plus size={19} /></IconTile>}
          tag={adminTag}
          title="Set up from zero, as the admin"
          body="Create the workspace, choose the agents to govern, publish your intent contract, connect a runtime and invite your team — every page fills in from what you do."
          cta={adminCta}
          primary={!fresh || !ob.adminDone}
          here={fresh}
          onCta={setUp}
          after={fresh && erasable ? (
            confirmReset ? (
              <div onClick={(e) => e.stopPropagation()} style={{
                marginTop: 12, padding: "10px 12px", borderRadius: 10, cursor: "default",
                background: "var(--surface-2)", border: "1px solid var(--line)",
                fontSize: 12.5, lineHeight: 1.5, color: "var(--fg-2)",
              }}>
                Erase the fresh workspace and begin again from day one? The Veridian demo is not touched.
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn btn-danger btn-sm" onClick={startOver}>Erase and start over</button>
                  <button className="btn btn-sm" onClick={() => setConfirmReset(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: "flex-start", marginTop: 8, marginLeft: -10 }}
                onClick={(e) => { e.stopPropagation(); setConfirmReset(true); }}
              >
                <RotateCcw size={13} /> Start over
              </button>
            )
          ) : undefined}
        />
        <PathCard
          icon={
            <span style={{ position: "relative", display: "inline-grid" }}>
              <Avatar userId={EMPLOYEE_ID} size={40} />
              {EMPLOYEE_AGENT && (
                <span style={{
                  position: "absolute", right: -5, bottom: -3, width: 20, height: 20, borderRadius: 6,
                  display: "grid", placeItems: "center", background: LOGO_TILE,
                  border: "1px solid var(--line)", boxShadow: "var(--shadow-sm)",
                }}>
                  <AgentMark agentId={EMPLOYEE_AGENT.id} size={13} />
                </span>
              )}
            </span>
          }
          tag={employeeTag}
          title="Join as an employee"
          body="See the employee side: accept the invite, install, and watch your agent get governed."
          cta={`Join as ${(userById(EMPLOYEE_ID)?.name ?? "Daniel").split(" ")[0]}`}
          primary={fresh && ob.adminDone && !ob.employeeDone}
          onCta={() => nav("onboarding/employee")}
        />
        <PathCard
          icon={<IconTile tone="constrain"><Building2 size={19} /></IconTile>}
          tag={{ text: "Demo · 3 months in", tone: "neutral" }}
          title="Explore Veridian Systems"
          body="A company three months in: real history, reviews, tasks and evidence."
          cta={fresh ? "Explore Veridian" : "Open the Control Room"}
          here={!fresh}
          onCta={explore}
          after={
            <div className="small faint" style={{ marginTop: 10 }}>
              {fresh
                ? "Your fresh workspace stays exactly as you left it."
                : `${plural(m.total, "decision")} · ${m.pendingReviews} awaiting review · ${plural(activeRules, "rule")} enforcing`}
            </div>
          }
        />
      </div>

      {/* 3 · Setup checklist -------------------------------------------- */}
      <section className="card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
        <div className="spread" style={{ padding: "20px 24px 18px", alignItems: "flex-end", gap: 20 }}>
          <div style={{ minWidth: 0, flex: "1 1 320px" }}>
            <div className="eyebrow">{fresh ? "Fresh workspace" : "Demo · 3 months in"}</div>
            <h2 style={{ fontSize: 18, fontWeight: 650, letterSpacing: "-0.015em", marginTop: 6 }}>{company} — setup checklist</h2>
            <div className="dim" style={{ fontSize: 13.5, marginTop: 3 }}>
              {next ? `${done} of ${items.length} done — ${next.label.toLowerCase()} next.` : "Everything is live."}
            </div>
          </div>
          <div style={{ flex: "0 1 260px", minWidth: 180 }}>
            <div className="spread small" style={{ marginBottom: 7 }}>
              <span className="faint">Progress</span>
              <span className="tnum" style={{ fontWeight: 600 }}>{pct}%</span>
            </div>
            <div
              role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done}
              aria-label={`${done} of ${items.length} setup steps done`}
              style={{ height: 6, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}
            >
              <div style={{
                width: `${pct}%`, height: "100%", borderRadius: 999,
                background: "linear-gradient(90deg, var(--accent), color-mix(in oklab, var(--accent) 55%, var(--constrain)))",
                transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              }} />
            </div>
          </div>
        </div>
        <div className="grid g2" style={{ gap: "2px 12px", padding: "10px 12px 12px", borderTop: "1px solid var(--line)" }}>
          {items.map((it) => {
            const isNext = it === next;
            return (
              <button
                key={it.label}
                className="setup-step"
                onClick={() => nav(it.route)}
                aria-label={`${it.label} — ${it.done ? "done" : "not done"}. ${it.hint}`}
                style={{
                  alignItems: "center", gap: 12, padding: "10px 12px",
                  ...(isNext ? {
                    background: "color-mix(in oklab, var(--accent) 7%, transparent)",
                    borderColor: "color-mix(in oklab, var(--accent) 26%, transparent)",
                  } : null),
                }}
              >
                <span
                  className={`setup-num${it.done ? " done" : ""}`}
                  aria-hidden="true"
                  style={{ width: 22, height: 22, marginTop: 0, ...(isNext ? { borderColor: "var(--accent)" } : null) }}
                >
                  {it.done && <Check size={12} strokeWidth={3} />}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="setup-step-title" style={{ color: it.done ? "var(--fg-2)" : "var(--fg)" }}>{it.label}</span>
                  <span className="setup-step-sub" style={ellipsis}>{it.hint}</span>
                </span>
                {isNext && <Chip tone="neutral">Next</Chip>}
                <ArrowRight size={14} style={{ color: "var(--fg-4)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero glass panel — replays the workspace's latest real decisions
// ---------------------------------------------------------------------------

const ROW = 60;
const GAP = 8;
const SHOWN = 3;
const WINDOW = 8; // replay the latest N recorded decisions
const windowHeight = (rows: number) => rows * ROW + Math.max(0, rows - 1) * GAP;

function DecisionPanel({ events, total, company, nav }: {
  events: SimulationEvent[]; total: number; company: string; nav: (r: string) => void;
}) {
  // Chronological (oldest → newest) window of the latest recorded decisions.
  const recent = useMemo(() => [...events].sort((a, b) => a.timestamp - b.timestamp).slice(-WINDOW), [events]);
  const n = recent.length;
  const newest = recent[n - 1]?.id;
  const rotates = n > SHOWN;
  const [t, setT] = useState(Math.max(0, n - 1)); // top row = recent[t mod n]
  const [paused, setPaused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // A newly recorded decision goes straight to the top.
  useEffect(() => { setT(Math.max(0, n - 1)); }, [newest, n]);

  // Advance every 1.9 s; hover/focus pauses so a row can be read. Reduced motion: no auto-advance.
  useEffect(() => {
    if (!rotates || paused || reducedMotion()) return;
    const id = window.setInterval(() => setT((x) => x + 1), 1900);
    return () => window.clearInterval(id);
  }, [rotates, paused]);

  // Slide: render the new top row above the window, then ease the list down one row.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !rotates || reducedMotion()) return;
    el.style.transition = "none";
    el.style.transform = `translateY(-${ROW + GAP}px)`;
    void el.offsetHeight; // commit the start position before animating
    el.style.transition = "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.transform = "translateY(0)";
  }, [t, rotates]);

  const at = (k: number) => recent[(((t - k) % n) + n) % n];
  const rows = n === 0 ? [] : Array.from({ length: rotates ? SHOWN + 1 : n }, (_, k) => at(k));

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      style={{
        flex: "1 1 340px", minWidth: 0, maxWidth: 520, padding: 16, borderRadius: "var(--r-lg)",
        background: "color-mix(in oklab, var(--surface) 60%, transparent)",
        border: "1px solid color-mix(in oklab, var(--fg) 9%, transparent)",
        boxShadow: "var(--shadow-lg), inset 0 1px 0 color-mix(in oklab, var(--surface) 85%, transparent)",
        backdropFilter: "blur(18px) saturate(150%)", WebkitBackdropFilter: "blur(18px) saturate(150%)",
        ...depth(9),
      }}
    >
      <div className="spread" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Decisions, as they happen</span>
        {total > 0 ? (
          // .pill-ok is hidden below 1000px (a topbar rule), so its look is inlined here.
          <span className="pill" style={{
            height: 24, fontSize: 11.5, padding: "0 10px", color: "var(--allow)",
            background: "color-mix(in oklab, var(--allow) 8%, transparent)",
            boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--allow) 26%, transparent)",
          }}>
            <span className="pill-dot live-dot" style={{ background: "var(--allow)" }} />
            {total.toLocaleString("en-US")} recorded
          </span>
        ) : (
          <span className="pill" style={{ height: 24, fontSize: 11.5, padding: "0 10px" }}>
            <span className="pill-dot" style={{ background: "var(--fg-4)" }} />
            None recorded
          </span>
        )}
      </div>

      {n === 0 ? (
        <div style={{
          height: windowHeight(SHOWN), display: "grid", placeItems: "center", textAlign: "center", padding: 20,
          borderRadius: 12, border: "1px dashed color-mix(in oklab, var(--fg) 16%, transparent)",
        }}>
          <div>
            <Radio size={20} style={{ color: "var(--fg-3)" }} />
            <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 8 }}>No decisions yet — run a go-live self-test in setup</div>
            <div className="small faint" style={{ marginTop: 4 }}>Nothing shows here until {company} records a real one.</div>
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => nav("onboarding/admin")}>
              Open setup <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          aria-live="off"
          style={{
            height: windowHeight(Math.min(n, SHOWN)), overflow: "hidden", position: "relative",
            ...(rotates ? {
              maskImage: "linear-gradient(to bottom, black 58%, color-mix(in srgb, black 30%, transparent) 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 58%, color-mix(in srgb, black 30%, transparent) 100%)",
            } : null),
          }}
        >
          <div ref={listRef} style={{ display: "flex", flexDirection: "column", gap: GAP, willChange: "transform" }}>
            {rows.map((e, k) => <TickerRow key={k} e={e} />)}
          </div>
        </div>
      )}

      <div className="spread" style={{ marginTop: 12 }}>
        <span className="small faint" style={{ ...ellipsis, minWidth: 0, flex: 1 }}>
          {n === 0 ? `${company} · nothing recorded`
            : paused && rotates ? "Paused — move away to resume"
            : `Latest ${n} of ${total.toLocaleString("en-US")} in ${company}`}
        </span>
        {n > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => nav("live")}>
            Live Actions <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function TickerRow({ e }: { e: SimulationEvent }) {
  const agent = agentById(e.agent);
  const sentence = describe(e);
  const why = e.decidedBy?.label ?? e.decisionReasons[0] ?? "";
  return (
    <div
      title={`${sentence} — ${e.decision}${why ? `\n${why}` : ""}`}
      style={{
        height: ROW, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "0 12px",
        borderRadius: 12, background: "color-mix(in oklab, var(--surface) 90%, transparent)",
        border: "1px solid color-mix(in oklab, var(--fg) 7%, transparent)", boxShadow: "var(--shadow-sm)",
      }}
    >
      <span style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center",
        background: LOGO_TILE, border: "1px solid var(--line)",
      }}>
        <AgentMark agentId={e.agent} size={18} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ ...ellipsis, fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>{sentence}</div>
        <div style={{ ...ellipsis, fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
          {agent?.name ?? e.agent}{why ? ` · ${why}` : ""} · {timeAgo(e.timestamp)}
        </div>
      </div>
      <DecisionChip d={e.decision} small />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Path card
// ---------------------------------------------------------------------------

function IconTile({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "constrain" }) {
  const other = tone === "accent" ? "var(--constrain)" : "var(--accent)";
  return (
    <span style={{
      width: 40, height: 40, borderRadius: 12, display: "grid", placeItems: "center", color: "var(--accent-fg)",
      background: `linear-gradient(135deg, var(--${tone}), color-mix(in oklab, var(--${tone}) 58%, ${other}))`,
      boxShadow: `0 8px 18px -10px color-mix(in oklab, var(--${tone}) 85%, transparent)`,
    }}>
      {children}
    </span>
  );
}

function PathCard({ icon, tag, title, body, cta, onCta, primary, here, after }: {
  icon: ReactNode;
  tag: { text: string; tone: string };
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  primary?: boolean;
  here?: boolean;
  after?: ReactNode;
}) {
  // The whole card is the target; the CTA button is its keyboard-focusable face.
  return (
    <div
      className="card clickable-card"
      onClick={onCta}
      style={{
        display: "flex", flexDirection: "column", padding: 22,
        ...(here ? { borderColor: "color-mix(in oklab, var(--accent) 42%, var(--line))" } : null),
      }}
    >
      <div className="spread" style={{ alignItems: "flex-start" }}>
        {icon}
        {here && <span className="chip c-neutral">You're here</span>}
      </div>
      {/* Status tag in the sans face — the decision tones render mono by default, which is reserved for decisions. */}
      <div style={{ marginTop: 16 }}><span className={`chip c-${tag.tone}`} style={{ fontFamily: "var(--sans)", letterSpacing: "0.01em" }}>{tag.text}</span></div>
      <div style={{ fontSize: 16.5, fontWeight: 650, letterSpacing: "-0.015em", marginTop: 8 }}>{title}</div>
      <p className="dim" style={{ fontSize: 13, lineHeight: 1.55, margin: "6px 0 0", flex: 1 }}>{body}</p>
      <div className="row" style={{ marginTop: 16 }}>
        <button type="button" className={`btn${primary ? " btn-primary" : ""}`}>
          {cta} <ArrowRight size={14} />
        </button>
      </div>
      {after}
    </div>
  );
}
