// Coverage Map — "can Wrapbox really keep each promise?" Every row is derived
// live from the switched-on contracts, the always-on Safety Kernel and the
// Capability Registry (engine/coverage.ts). Nothing on this page is typed in.
// Deliberately not all-green: gaps are the product being honest.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, StatusChip, SimNote, Chip, MetricBar, usePaged, Pager } from "../ui/kit";
import { logoUrl, INTEGRATION_LOGOS } from "../ui/logos";
import { CAPABILITIES, DATA_TYPES } from "../model/registries";
import { buildCoverageMatrix, type CoverageRow } from "../engine/coverage";
import type { CoverageStatus } from "../model/types";
import type { ReactNode } from "react";
import { ShieldCheck, ShieldAlert, Eye, Clock, Lock, ArrowRight, X, Laptop, Network, DoorOpen, Cpu } from "lucide-react";

const STATUS_META: Record<CoverageStatus, { icon: ReactNode; tone?: string; note: string }> = {
  ENFORCED: { icon: <ShieldCheck size={17} />, tone: "good", note: "can see it and stop it" },
  DEGRADED: { icon: <ShieldAlert size={17} />, tone: "warn", note: "can stop it, not perfectly" },
  UNDERSTOOD_ONLY: { icon: <Eye size={17} />, tone: "info", note: "can see it, can't stop it yet" },
  PENDING: { icon: <Clock size={17} />, tone: undefined, note: "skill not built yet" },
  UNINSPECTABLE: { icon: <Lock size={17} />, tone: "bad", note: "locked content — blocked to be safe" },
};

// One tone per status, aligned to the StatusChip colours so the posture bar,
// the metric dots and every chip in the tables read as one language.
const STATUS_TONE: Record<CoverageStatus, string> = {
  ENFORCED: "allow",
  DEGRADED: "review",
  UNDERSTOOD_ONLY: "accent",
  PENDING: "fg-4",
  UNINSPECTABLE: "block",
};

// A crisp glyph per plane, with a real vendor mark where a skill governs a
// specific integration (GitHub / AWS / SQL / MCP gateways).
const PLANE_ICON: Record<string, ReactNode> = {
  ENDPOINT: <Laptop size={15} />,
  NETWORK: <Network size={15} />,
  GATEWAY: <DoorOpen size={15} />,
  BRAIN: <Cpu size={15} />,
};
const CAP_LOGO: Record<string, string> = {
  "cap-gw-github": INTEGRATION_LOGOS.GitHub,
  "cap-gw-cloud": INTEGRATION_LOGOS.AWS,
  "cap-gw-sql": INTEGRATION_LOGOS.PostgreSQL,
  "cap-gw-mcp": INTEGRATION_LOGOS.MCP,
};

type Tab = "rules" | "safety" | "gaps" | "inactive" | "skills" | "data";

const TAB_HINT: Record<Tab, string> = {
  rules: "The rules your company wrote that are switched on — and whether Wrapbox has the skills to keep each one.",
  safety: "Built-in protections that are always on, even if nobody wrote a rule. They can't be switched off.",
  gaps: "Skills that aren't fully ready yet — the build list. Sorted so the skill holding back the most promises is first.",
  inactive: "Rules that are written but switched off (drafts or turned off). They protect nothing right now.",
  skills: "Every skill Wrapbox has, per plane. Every status on this page comes from here.",
  data: "Every kind of sensitive data Wrapbox recognizes, and how dangerous it is if it leaks.",
};

function StatusDot({ s }: { s: CoverageStatus }) {
  return <span style={{ width: 7, height: 7, borderRadius: 999, flexShrink: 0, background: `var(--${STATUS_TONE[s]})` }} />;
}

function RuleTable({ rows, showReason }: { rows: CoverageRow[]; showReason?: boolean }) {
  const paged = usePaged(rows, 8, rows.map((r) => r.id).join("|"));
  return (
    <div className="card card-pad-0">
      <table className="tbl tbl-wide">
        <thead>
          <tr>
            <th style={{ minWidth: 260 }}>Promise</th><th>Data</th><th>Where to</th><th>Plane</th><th>Needs these skills</th>
            <th>{showReason ? "Would be" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {paged.rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="row" style={{ gap: 9, flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <span style={{ marginTop: 6 }}><StatusDot s={r.status} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div className="small" style={{ fontWeight: 600, lineHeight: 1.45 }}>{r.title}</div>
                    <div className="small faint" style={{ marginTop: 2 }}>
                      {r.source}{showReason && r.inactiveReason ? ` · ${r.inactiveReason}` : ""}
                    </div>
                  </div>
                </div>
              </td>
              <td>
                {r.dataClasses.length === 0
                  ? <span className="small faint">any data</span>
                  : <div className="row" style={{ gap: 4 }}>{r.dataClasses.map((d) => <Chip key={d} tone="violet">{d}</Chip>)}</div>}
              </td>
              <td className="small dim">{r.destination}</td>
              <td><div className="row" style={{ gap: 4 }}>{r.planes.map((p) => <Chip key={p} tone="neutral">{p}</Chip>)}</div></td>
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 170 }}>
                  {r.needs.map((n) => (
                    <div key={n.id} className="spread small" style={{ gap: 12, flexWrap: "nowrap" }}>
                      <span className="dim" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>
                      <StatusChip s={n.status} />
                    </div>
                  ))}
                </div>
              </td>
              <td><StatusChip s={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager {...paged} />
    </div>
  );
}

export function CoverageMap({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = useMemo(() => buildCoverageMatrix(s.contracts, s.kernel), [s.contracts, s.kernel]);
  const [tab, setTab] = useState<Tab>("rules");
  // "Show me the promises this weak skill is holding back" (from Known gaps).
  const [skill, setSkill] = useState<{ id: string; label: string } | null>(null);
  const pagedCaps = usePaged(CAPABILITIES, 8);
  const pagedData = usePaged(DATA_TYPES, 8);
  const order: CoverageStatus[] = ["ENFORCED", "DEGRADED", "UNDERSTOOD_ONLY", "PENDING", "UNINSPECTABLE"];

  const bySkill = (rows: CoverageRow[]) => (skill ? rows.filter((r) => r.needs.some((n) => n.id === skill.id)) : rows);
  const go = (t: Tab) => { setTab(t); if (t !== "rules" && t !== "safety") setSkill(null); };
  const jump = (t: Tab, g: CoverageRow) => { setSkill({ id: g.id, label: g.title }); setTab(t); };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "rules", label: "Your rules", count: m.rules.length },
    { id: "safety", label: "Always-on safety", count: m.safety.length },
    { id: "gaps", label: "Known gaps", count: m.gaps.length },
    { id: "inactive", label: "Not switched on", count: m.inactive.length },
    { id: "skills", label: "Skills", count: CAPABILITIES.length },
    { id: "data", label: "Data types", count: DATA_TYPES.length },
  ];

  // Presentation-only aggregates over the same live counts (no new state).
  const total = order.reduce((sum, st) => sum + m.counts[st], 0);
  const kpi = order.map((st) => ({
    label: st.replaceAll("_", " "),
    value: m.counts[st],
    note: STATUS_META[st].note,
    tone: STATUS_TONE[st],
  }));

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Visibility"
        title="Coverage Map"
        sub="Can Wrapbox really keep each promise? Every row is calculated live from your switched-on rules and Wrapbox's skills — switch a rule on or off and this page changes by itself."
        right={<SimNote>Skill states are demo data; the calculation is live</SimNote>}
      />

      {/* Coverage posture — one proportional bar + a refined KPI legend, in a single panel. */}
      <div className="card">
        <div className="section-head" style={{ marginBottom: 16, alignItems: "flex-start" }}>
          <div>
            <div className="section-title">Coverage posture</div>
            <div className="section-sub">
              Every live promise — your switched-on rules, always-on safety and known skill gaps — by what Wrapbox can actually deliver.
            </div>
          </div>
        </div>

        <div className="decision-track" style={{ height: 30 }} role="img" aria-label="Coverage posture by status">
          {order.map((st) => {
            const n = m.counts[st];
            if (!n) return null;
            return (
              <div
                key={st}
                title={`${n} ${st.replaceAll("_", " ").toLowerCase()}`}
                style={{ flex: `${n} 0 0`, minWidth: 2, background: `var(--${STATUS_TONE[st]})` }}
              />
            );
          })}
          {total === 0 && <div style={{ flex: 1, background: "var(--surface-2)" }} />}
        </div>

        <div style={{ marginTop: 18 }}>
          <MetricBar band items={kpi} />
        </div>
      </div>

      <div className="section">
        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => go(t.id)}>
              {t.label}<span className="tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="spread" style={{ marginBottom: 14 }}>
          <div className="small dim" style={{ maxWidth: 720 }}>{TAB_HINT[tab]}</div>
          {tab === "rules" && (
            <button className="btn btn-sm" onClick={() => nav("intent")}>Intent Studio <ArrowRight size={13} /></button>
          )}
        </div>

        {skill && (tab === "rules" || tab === "safety") && (
          <div className="filter-bar">
            Showing only promises that need <b>{skill.label}</b>
            <button className="btn btn-ghost btn-sm" onClick={() => setSkill(null)}><X size={13} /> Clear</button>
          </div>
        )}

        {tab === "rules" && (
          m.rules.length === 0
            ? <div className="card empty">No rules are switched on. Write and activate one in Intent Studio.</div>
            : bySkill(m.rules).length === 0
              ? <div className="card empty">No switched-on rule needs this skill.</div>
              : <RuleTable rows={bySkill(m.rules)} />
        )}

        {tab === "safety" && (
          bySkill(m.safety).length === 0
            ? <div className="card empty">No always-on safety rule needs this skill.</div>
            : <RuleTable rows={bySkill(m.safety)} />
        )}

        {tab === "gaps" && (
          m.gaps.length === 0
            ? <div className="card empty">No gaps — every skill your switched-on rules rely on is fully enforced.</div>
            : <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Skill</th><th>Plane</th><th>Status</th><th>Affects</th><th>Why</th></tr></thead>
              <tbody>
                {m.gaps.map((g) => {
                  const nr = g.affects?.rules.length ?? 0;
                  const ns = g.affects?.safety.length ?? 0;
                  return (
                    <tr key={g.id}>
                      <td>
                        <div className="row" style={{ gap: 9, flexWrap: "nowrap" }}>
                          <StatusDot s={g.status} />
                          <b className="small">{g.title}</b>
                        </div>
                      </td>
                      <td><Chip tone="neutral">{g.planes[0]}</Chip></td>
                      <td><StatusChip s={g.status} /></td>
                      <td>
                        {nr + ns === 0 ? (
                          <span className="small faint">no promise yet</span>
                        ) : (
                          <div className="row small" style={{ gap: 10 }}>
                            {nr > 0 && <a onClick={() => jump("rules", g)}>{nr} {nr === 1 ? "rule" : "rules"}</a>}
                            {ns > 0 && <a onClick={() => jump("safety", g)}>{ns} safety</a>}
                          </div>
                        )}
                      </td>
                      <td className="small dim">{g.source}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "inactive" && (
          m.inactive.length === 0
            ? <div className="card empty">Every written rule is switched on.</div>
            : <RuleTable rows={m.inactive} showReason />
        )}

        {tab === "skills" && (
          CAPABILITIES.length === 0
            ? <div className="card empty">No skills registered yet.</div>
            : <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Capability</th><th>Plane</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {pagedCaps.rows.map((c) => {
                  const lg = CAP_LOGO[c.id];
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="row" style={{ gap: 11, flexWrap: "nowrap" }}>
                          <span className="plane-icon" style={{ width: 28, height: 28 }}>
                            {lg ? <img src={logoUrl(lg)} alt="" className="logo-img" /> : PLANE_ICON[c.plane]}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div className="small" style={{ fontWeight: 600 }}>{c.label}</div>
                            <div className="mono faint small">{c.id}</div>
                          </div>
                        </div>
                      </td>
                      <td><Chip tone="neutral">{c.plane}</Chip></td>
                      <td><StatusChip s={c.status} /></td>
                      <td className="small dim">{c.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pager {...pagedCaps} />
          </div>
        )}

        {tab === "data" && (
          DATA_TYPES.length === 0
            ? <div className="card empty">No data classes registered yet.</div>
            : <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Class</th><th>Family</th><th>Example</th><th>Severity</th></tr></thead>
              <tbody>
                {pagedData.rows.map((d) => (
                  <tr key={d.id}>
                    <td><Chip tone="violet">{d.id}</Chip></td>
                    <td><Chip tone="neutral">{d.family}</Chip></td>
                    <td className="mono small dim">{d.example}</td>
                    <td><Chip tone={d.severity}>{d.severity}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pager {...pagedData} />
          </div>
        )}
      </div>
    </div>
  );
}
