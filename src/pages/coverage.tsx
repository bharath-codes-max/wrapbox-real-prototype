// Coverage Map — "can Wrapbox really keep each promise?" Every row is derived
// live from the switched-on contracts, the always-on Safety Kernel and the
// Capability Registry (engine/coverage.ts). Nothing on this page is typed in.
// Deliberately not all-green: gaps are the product being honest.
import { useMemo } from "react";
import { useAppState } from "../state/store";
import { PageHead, StatusChip, SimNote, Chip, SectionHead, Stat } from "../ui/kit";
import { CAPABILITIES, DATA_TYPES } from "../model/registries";
import { buildCoverageMatrix, type CoverageRow } from "../engine/coverage";
import type { CoverageStatus } from "../model/types";
import type { ReactNode } from "react";
import { ShieldCheck, ShieldAlert, Eye, Clock, Lock, Boxes, Database, ArrowRight } from "lucide-react";

const STATUS_META: Record<CoverageStatus, { icon: ReactNode; tone?: string; note: string }> = {
  ENFORCED: { icon: <ShieldCheck size={17} />, tone: "good", note: "can see it and stop it" },
  DEGRADED: { icon: <ShieldAlert size={17} />, tone: "warn", note: "can stop it, not perfectly" },
  UNDERSTOOD_ONLY: { icon: <Eye size={17} />, tone: "info", note: "can see it, can't stop it yet" },
  PENDING: { icon: <Clock size={17} />, tone: undefined, note: "skill not built yet" },
  UNINSPECTABLE: { icon: <Lock size={17} />, tone: "bad", note: "locked content — blocked to be safe" },
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
  const order: CoverageStatus[] = ["ENFORCED", "DEGRADED", "UNDERSTOOD_ONLY", "PENDING", "UNINSPECTABLE"];

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Visibility"
        title="Coverage Map"
        sub="Can Wrapbox really keep each promise? Every row below is calculated live from your switched-on rules and Wrapbox's skills — switch a rule on or off and this page changes by itself."
        right={<SimNote>Skill states are demo data; the calculation is live</SimNote>}
      />

      <div className="section">
        <SectionHead
          title="Enforcement status"
          sub={`${m.rules.length} switched-on rules · ${m.safety.length} always-on safety rules · ${m.gaps.length} known skill gaps`}
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
      </div>

      <div className="section">
        <SectionHead
          title="Your switched-on rules"
          sub="Each Intent Contract rule that is ACTIVE, and whether Wrapbox has the skills to keep it"
          right={<button className="btn btn-sm" onClick={() => nav("intent")}>Intent Studio <ArrowRight size={13} /></button>}
        />
        {m.rules.length === 0
          ? <div className="card empty">No rules are switched on. Write and activate one in Intent Studio.</div>
          : <RuleTable rows={m.rules} />}
      </div>

      <div className="section">
        <SectionHead title="Always-on safety" sub="Built-in Safety Kernel protections — they apply even when no rule has been written" />
        <RuleTable rows={m.safety} />
      </div>

      <div className="section">
        <SectionHead title="Known gaps" sub="Skills that are not fully enforced yet — shown so nobody assumes protection that isn't there" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Skill</th><th>Plane</th><th>Status</th><th>Why</th></tr></thead>
            <tbody>
              {m.gaps.map((g) => (
                <tr key={g.id}>
                  <td><b className="small">{g.title}</b></td>
                  <td><Chip tone="neutral">{g.planes[0]}</Chip></td>
                  <td><StatusChip s={g.status} /></td>
                  <td className="small dim">{g.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {m.inactive.length > 0 && (
        <div className="section">
          <SectionHead title="Not switched on" sub="Drafts and switched-off rules — not protecting anything yet, shown with the status they would have" />
          <RuleTable rows={m.inactive} showReason />
        </div>
      )}

      <div className="section">
        <SectionHead title="Capability registry" sub="Every skill Wrapbox has, per plane — the source for every status above" right={<Boxes size={16} className="dim" />} />
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
      </div>

      <div className="section">
        <SectionHead title="Data type registry" sub="The classes Wrapbox recognizes and how it grades them" right={<Database size={16} className="dim" />} />
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
      </div>
    </div>
  );
}
