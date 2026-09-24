// Coverage Map — "can Wrapbox really keep each promise?" Every row is derived
// live from the switched-on contracts, the always-on Safety Kernel and the
// Capability Registry (engine/coverage.ts). Nothing on this page is typed in.
// Deliberately not all-green: gaps are the product being honest.
import { useMemo, useState } from "react";
import { useAppState } from "../state/store";
import { PageHead, StatusChip, SimNote, Chip, Stat } from "../ui/kit";
import { CAPABILITIES, DATA_TYPES } from "../model/registries";
import { buildCoverageMatrix, type CoverageRow } from "../engine/coverage";
import type { CoverageStatus } from "../model/types";
import type { ReactNode } from "react";
import { ShieldCheck, ShieldAlert, Eye, Clock, Lock, ArrowRight, X } from "lucide-react";

const STATUS_META: Record<CoverageStatus, { icon: ReactNode; tone?: string; note: string }> = {
  ENFORCED: { icon: <ShieldCheck size={17} />, tone: "good", note: "can see it and stop it" },
  DEGRADED: { icon: <ShieldAlert size={17} />, tone: "warn", note: "can stop it, not perfectly" },
  UNDERSTOOD_ONLY: { icon: <Eye size={17} />, tone: "info", note: "can see it, can't stop it yet" },
  PENDING: { icon: <Clock size={17} />, tone: undefined, note: "skill not built yet" },
  UNINSPECTABLE: { icon: <Lock size={17} />, tone: "bad", note: "locked content — blocked to be safe" },
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

function RuleTable({ rows, showReason }: { rows: CoverageRow[]; showReason?: boolean }) {
  return (
    <div className="card card-pad-0">
      <table className="tbl tbl-wide">
        <thead>
          <tr>
            <th style={{ minWidth: 240 }}>Promise</th><th>Data</th><th>Where to</th><th>Plane</th><th>Needs these skills</th>
            <th>{showReason ? "Would be" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                <div className="small" style={{ fontWeight: 550 }}>{r.title}</div>
                <div className="small faint" style={{ marginTop: 2 }}>
                  {r.source}{showReason && r.inactiveReason ? ` · ${r.inactiveReason}` : ""}
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
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {r.needs.map((n) => (
                    <div key={n.id} className="row small" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <span className="dim" style={{ whiteSpace: "nowrap" }}>{n.label}</span>
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
    </div>
  );
}

export function CoverageMap({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const m = useMemo(() => buildCoverageMatrix(s.contracts), [s.contracts]);
  const [tab, setTab] = useState<Tab>("rules");
  // "Show me the promises this weak skill is holding back" (from Known gaps).
  const [skill, setSkill] = useState<{ id: string; label: string } | null>(null);
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

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Visibility"
        title="Coverage Map"
        sub="Can Wrapbox really keep each promise? Every row is calculated live from your switched-on rules and Wrapbox's skills — switch a rule on or off and this page changes by itself."
        right={<SimNote>Skill states are demo data; the calculation is live</SimNote>}
      />

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        {order.map((st) => (
          <Stat
            key={st}
            icon={STATUS_META[st].icon}
            tone={STATUS_META[st].tone}
            label={st.replaceAll("_", " ")}
            value={m.counts[st]}
            note={STATUS_META[st].note}
          />
        ))}
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
          <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Skill</th><th>Plane</th><th>Status</th><th>Affects</th><th>Why</th></tr></thead>
              <tbody>
                {m.gaps.map((g) => {
                  const nr = g.affects?.rules.length ?? 0;
                  const ns = g.affects?.safety.length ?? 0;
                  return (
                    <tr key={g.id}>
                      <td><b className="small">{g.title}</b></td>
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
          <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Capability</th><th>Plane</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {CAPABILITIES.map((c) => (
                  <tr key={c.id}>
                    <td><b className="small">{c.label}</b> <span className="mono faint small">{c.id}</span></td>
                    <td><Chip tone="neutral">{c.plane}</Chip></td>
                    <td><StatusChip s={c.status} /></td>
                    <td className="small dim">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "data" && (
          <div className="card card-pad-0">
            <table className="tbl">
              <thead><tr><th>Class</th><th>Family</th><th>Example</th><th>Severity</th></tr></thead>
              <tbody>
                {DATA_TYPES.map((d) => (
                  <tr key={d.id}>
                    <td><Chip tone="violet">{d.id}</Chip></td>
                    <td className="small">{d.family}</td>
                    <td className="mono small dim">{d.example}</td>
                    <td><Chip tone={d.severity}>{d.severity}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
