// Standing Permissions — an agent's everyday authority on one system, outside
// any task. Enforced by the Core Brain: in-scope work flows, limits and the
// "may not" list apply, and once revoked or expired that agent's work there
// needs a human yes. Inside a task, the task's permission slip is the authority.
import { useMemo, useState } from "react";
import {
  useAppState, revokeStanding, grantStandingAgain, shadowEvaluate, grantStanding, standingGrantError, standingFromGrant,
  STANDING_VERBS, STANDING_DENY_PRESETS, type StandingGrant,
} from "../state/store";
import { PageHead, SectionHead, MetricBar, Chip, SimNote, AgentMark, Avatar, DecisionChip, PageTabs, EntityCard, CardGrid } from "../ui/kit";
import { AGENTS, RESOURCES, agentById, resourceById, userById } from "../model/org";
import { SCENARIOS, scenarioById } from "../engine/scenarios";
import { Modal, Segmented } from "../ui/setup";
import { Select } from "../ui/kit";
import { DESKTOP_SHELL } from "../ui/shell";
import { describe } from "../ui/describe";
import type { ActionVerb, Environment, StandingPermission } from "../model/types";
import { ShieldCheck, Clock, Ban, Check, X, ArrowRight, Activity, RotateCcw, Plus } from "lucide-react";

const ENVIRONMENTS: Environment[] = ["development", "test", "staging", "production", "local"];
// Secrets and unregistered servers are never everyday authority.
const GRANTABLE = RESOURCES.filter((r) => r.kind !== "secret" && r.kind !== "mcp");
const GRANTER = "u-priya"; // the signed-in admin in this prototype

/** Grant an agent everyday authority on one system. Every choice goes into the same
 *  StandingPermission the Core Brain reads; the preview runs the real engine on the
 *  draft before anything is saved. */
function GrantModal({ onClose, onGranted }: { onClose: () => void; onGranted: () => void }) {
  const s = useAppState();
  const agents = AGENTS.filter((a) => !a.discovered);
  const taken = (agent: string, resource: string) => s.standing.some((p) => p.agent === agent && p.resource === resource);
  const [agent, setAgent] = useState(agents[0].id);
  const [resource, setResource] = useState(() => (GRANTABLE.find((r) => !taken(agents[0].id, r.id)) ?? GRANTABLE[0]).id);
  const res = resourceById(resource)!;
  const [actions, setActions] = useState<ActionVerb[]>(["READ"]);
  const [envs, setEnvs] = useState<Environment[]>([res.environment as Environment]);
  const [denyIds, setDenyIds] = useState<string[]>(res.environment === "production" ? [] : ["prod"]);
  const [maxRows, setMaxRows] = useState(500);
  const [maxFiles, setMaxFiles] = useState(25);
  const [days, setDays] = useState(7);
  const [failed, setFailed] = useState<string | null>(null);

  const pickResource = (id: string) => {
    const r = resourceById(id)!;
    setResource(id);
    setEnvs([r.environment as Environment]);
    setDenyIds(r.environment === "production" ? [] : ["prod"]);
  };
  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const rowLimit = res.kind === "database" && actions.includes("READ");
  const fileLimit = res.kind === "repo";
  const grant: StandingGrant = {
    agent, resource, actions, environments: envs, denyIds, days, grantedBy: GRANTER,
    ...(rowLimit ? { maxRows } : {}), ...(fileLimit ? { maxFilesPerTask: maxFiles } : {}),
  };
  const error = standingGrantError(grant, s.standing);

  // What the draft would change, decided by the real engine on the authored scenarios for this pair.
  const preview = useMemo(() => {
    if (error) return [];
    const draft = [...s.standing, standingFromGrant(grant)];
    return SCENARIOS.filter((sc) => sc.group !== "TASK" && sc.agent === agent && sc.resource === resource).map((sc) => ({
      id: sc.id, title: sc.title,
      now: shadowEvaluate(sc, s.contracts, s.kernel, s.standing),
      then: shadowEvaluate(sc, s.contracts, s.kernel, draft),
    }));
  }, [error, agent, resource, actions.join(), envs.join(), denyIds.join(), maxRows, maxFiles, days, rowLimit, fileLimit, s.standing, s.contracts, s.kernel]);

  const submit = () => {
    const out = grantStanding(grant);
    if (typeof out === "string") { setFailed(out); return; }
    onGranted();
  };

  return (
    <Modal onClose={onClose} width={640}>
      <div className="grant">
        <div className="grant-title">Grant an everyday permission</div>
        <p className="grant-sub">
          Inside it, the agent's work on this system flows under your rules. Outside it, or once it expires, a person must say yes.
          It never overrides a rule or the Safety Kernel.
        </p>

        <div className="grid g2" style={{ gap: 14 }}>
          <div className="field">
            <label className="field-label">Agent</label>
            <Select value={agent} onChange={setAgent} allLabel={null} options={agents.map((a) => ({ value: a.id, label: a.name }))} />
          </div>
          <div className="field">
            <label className="field-label">System</label>
            <Select value={resource} onChange={pickResource} allLabel={null} options={GRANTABLE.map((r) => ({ value: r.id, label: `${r.name} · ${r.environment}` }))} />
          </div>
        </div>

        <div className="field">
          <label className="field-label">May</label>
          <div className="grant-picks">
            {STANDING_VERBS.map((v) => (
              <button key={v.verb} type="button" aria-pressed={actions.includes(v.verb)} className={`grant-pick${actions.includes(v.verb) ? " on" : ""}`} onClick={() => setActions(flip(actions, v.verb))}>
                {actions.includes(v.verb) && <Check size={12} />}{v.label}
              </button>
            ))}
          </div>
          <span className="small faint">Secret access and permission or security changes can't be standing authority.</span>
        </div>

        <div className="field">
          <label className="field-label">Only in</label>
          <div className="grant-picks">
            {ENVIRONMENTS.map((e) => (
              <button key={e} type="button" aria-pressed={envs.includes(e)} className={`grant-pick${envs.includes(e) ? " on" : ""}`} onClick={() => setEnvs(flip(envs, e))}>
                {envs.includes(e) && <Check size={12} />}{e}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">May not</label>
          <div className="grant-picks">
            {STANDING_DENY_PRESETS.map((d) => (
              <button key={d.id} type="button" aria-pressed={denyIds.includes(d.id)} className={`grant-pick deny${denyIds.includes(d.id) ? " on" : ""}`} onClick={() => setDenyIds(flip(denyIds, d.id))}>
                {denyIds.includes(d.id) && <X size={12} />}{d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grant-row">
          {rowLimit && (
            <div className="field" style={{ width: 150 }}>
              <label className="field-label">Rows per query</label>
              <input className="input" type="number" min={1} value={maxRows} onChange={(e) => setMaxRows(Number(e.target.value))} />
            </div>
          )}
          {fileLimit && (
            <div className="field" style={{ width: 150 }}>
              <label className="field-label">Files per task</label>
              <input className="input" type="number" min={0} value={maxFiles} onChange={(e) => setMaxFiles(Math.max(0, Number(e.target.value)))} />
            </div>
          )}
          <div className="field">
            <label className="field-label">Expires in</label>
            <Segmented value={days} onChange={setDays} options={[1, 3, 7, 14, 30].map((d) => ({ value: d, label: `${d}d` }))} />
          </div>
        </div>

        <div className="grant-preview">
          <div className="field-label" style={{ marginBottom: 6 }}>What this changes right now</div>
          {error ? (
            <span className="small" style={{ color: "var(--block)" }}>{error}</span>
          ) : preview.length === 0 ? (
            <span className="small dim">No recorded scenario covers {agentById(agent)?.name} on {res.name} yet. The card applies to its work there from now on.</span>
          ) : (
            preview.map((r) => (
              <div key={r.id} className="row" style={{ gap: 6, flexWrap: "nowrap", marginTop: 4 }}>
                <DecisionChip d={r.now} small /><ArrowRight size={12} className="faint" style={{ flexShrink: 0 }} /><DecisionChip d={r.then} small />
                <span className="small dim" style={{ minWidth: 0 }}>{r.title}{r.now === r.then ? " — unchanged" : ""}</span>
              </div>
            ))
          )}
        </div>

        {failed && <div className="small" style={{ color: "var(--block)", marginTop: 10 }}>{failed}</div>}
        <div className="grant-foot">
          <span className="small faint row" style={{ gap: 6 }}>Granted by <Avatar userId={GRANTER} size={16} /> {userById(GRANTER)?.name}</span>
          <span className="row" style={{ gap: 8, marginLeft: "auto" }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={!!error} onClick={submit}><Check size={13} /> Grant for {days} day{days === 1 ? "" : "s"}</button>
          </span>
        </div>
      </div>
    </Modal>
  );
}

export function StandingPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);
  const [tabKey, setTabKey] = useState(0);
  const grantButton = DESKTOP_SHELL ? (
    <button className="btn btn-primary btn-sm" onClick={() => setGranting(true)}><Plus size={13} /> Grant permission</button>
  ) : null;
  const daysLeftOf = (p: StandingPermission) => Math.max(0, Math.round((p.expiresAt - Date.now()) / (24 * 3600 * 1000)));
  const isActive = (p: StandingPermission) => p.status === "active" && p.expiresAt > Date.now();
  const active = s.standing.filter(isActive);
  const expiringSoon = active.filter((p) => daysLeftOf(p) <= 2).length;

  // Everyday (non-task) actions each permission covers, and what revoking it would change.
  const impact = useMemo(() => {
    const out: Record<string, { used: number; wouldReview: { id: string; text: string }[] }> = {};
    for (const p of s.standing) {
      const covered = s.events.filter((e) => e.agent === p.agent && e.resource === p.resource && !e.taskId);
      const revoked = s.standing.map((x) => (x.id === p.id ? { ...x, status: "revoked" as const } : x));
      const wouldReview = covered
        .filter((e) => e.scenario && scenarioById(e.scenario))
        .filter((e) => {
          const sc = scenarioById(e.scenario!)!;
          const now = shadowEvaluate(sc, s.contracts, s.kernel, s.standing);
          const after = shadowEvaluate(sc, s.contracts, s.kernel, revoked);
          return now !== after;
        })
        .map((e) => ({ id: e.id, text: describe(e) }));
      out[p.id] = { used: covered.length, wouldReview };
    }
    return out;
  }, [s.standing, s.events, s.contracts, s.kernel]);

  const totalUsed = Object.values(impact).reduce((n, x) => n + x.used, 0);
  // Everything not in force: the complement of `active`, so the two tabs always partition s.standing.
  const inactive = s.standing.filter((p) => !isActive(p));

  const renderCard = (p: StandingPermission) => {
    const on = isActive(p);
    const imp = impact[p.id];
    const res = resourceById(p.resource)?.name ?? p.resource;
    const soon = daysLeftOf(p) <= 2;
    const may = [
      ...p.allowed,
      ...(p.maxRows !== undefined ? [`at most ${p.maxRows} rows per query`] : []),
      ...(p.maxFilesPerTask > 0 ? [`at most ${p.maxFilesPerTask} files per task (enforced by the task's slip)`] : []),
    ];
    const list = (items: string[], ok: boolean) => (
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((x) => (
          <span key={x} className="row" style={{ gap: 6, alignItems: "flex-start", flexWrap: "nowrap" }}>
            {ok ? <Check size={13} style={{ color: "var(--allow)", flexShrink: 0, marginTop: 3 }} /> : <X size={13} style={{ color: "var(--block)", flexShrink: 0, marginTop: 3 }} />}
            <span style={{ lineHeight: 1.5 }}>{x}</span>
          </span>
        ))}
      </span>
    );
    const action = on ? (
      confirming === p.id ? (
        <>
          <button className="btn btn-danger btn-sm" onClick={() => { revokeStanding(p.id); setConfirming(null); }}>Yes, revoke</button>
          <button className="btn btn-sm" onClick={() => setConfirming(null)}>Cancel</button>
        </>
      ) : (
        <button className="btn btn-danger btn-sm" onClick={() => setConfirming(p.id)}>Revoke</button>
      )
    ) : (
      <button className="btn btn-sm" onClick={() => grantStandingAgain(p.id, "u-priya")}><RotateCcw size={13} /> Grant again for 7 days</button>
    );
    return (
      <EntityCard
        key={p.id}
        tone={on ? undefined : "block"}
        icon={<AgentMark agentId={p.agent} size={26} />}
        eyebrow={res}
        title={`${agentById(p.agent)?.name ?? p.agent} — everyday permission`}
        status={
          <>
            <Chip tone={on ? "allow" : "block"}>{on ? "ACTIVE" : p.status === "revoked" ? "REVOKED" : "EXPIRED"}</Chip>
            {on && <Chip tone={soon ? "review" : "neutral"}><Clock size={11} /> expires in {daysLeftOf(p)}d</Chip>}
          </>
        }
        action={action}
        fields={[
          { label: "May", value: list(may, true) },
          { label: "May not", value: list(p.forbidden, false) },
          { label: "Granted by", value: <><Avatar userId={p.grantedBy} size={16} />{userById(p.grantedBy)?.name}</> },
          {
            label: "Impact",
            value: (
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="row" style={{ gap: 6, alignItems: "flex-start", flexWrap: "nowrap" }}>
                  <Activity size={13} className="faint" style={{ flexShrink: 0, marginTop: 3 }} />
                  <span style={{ lineHeight: 1.5 }}>
                    <b>Used {imp.used} time{imp.used === 1 ? "" : "s"}</b> for everyday work.{" "}
                    {on ? (
                      imp.wouldReview.length === 0
                        ? "Revoking it would not change any recorded action."
                        : <>If you revoked it, <b>{imp.wouldReview.length}</b> of those would have needed a human yes:</>
                    ) : (
                      <>Revoked — {agentById(p.agent)?.name}'s work on {res} now needs a human yes.</>
                    )}
                  </span>
                </span>
                {on && imp.wouldReview.slice(0, 3).map((w) => (
                  <span key={w.id} className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <DecisionChip d="ALLOW" small /><ArrowRight size={12} className="faint" style={{ flexShrink: 0 }} /><DecisionChip d="REVIEW" small /><span className="dim" style={{ minWidth: 0 }}>{w.text}</span>
                  </span>
                ))}
              </span>
            ),
          },
        ]}
      >
        {confirming === p.id && on && (
          <span className="small">Revoke {agentById(p.agent)?.name}'s everyday permission on {res}?</span>
        )}
      </EntityCard>
    );
  };

  return (
    <div className="page">
      <PageHead
        eyebrow="Authorization"
        title="Standing Permissions"
        sub="An agent's everyday authority on one system, outside any task. While it's active, normal work flows; its limits and 'may not' list are enforced; once revoked or expired, that agent's work there needs a human yes."
        right={<>{grantButton}<SimNote>Enforced by the Core Brain</SimNote></>}
      />
      {granting && (
        <GrantModal
          onClose={() => setGranting(false)}
          onGranted={() => {
            setGranting(false);
            try { sessionStorage.setItem("tab:standing", "active"); } catch { /* ignore */ }
            setTabKey((k) => k + 1); // land on Active, where the new card is
          }}
        />
      )}

      <div className="card">
        <MetricBar
          band
          items={[
            { label: "Active", value: active.length, tone: "good", note: "in force right now" },
            { label: "Expiring soon", value: expiringSoon, tone: expiringSoon > 0 ? "warn" : "good", note: "within 2 days" },
            { label: "Revoked / expired", value: s.standing.length - active.length, note: "needs a yes again" },
            { label: "Everyday actions covered", value: totalUsed, note: "recorded, outside tasks" },
          ]}
        />
      </div>

      <PageTabs key={tabKey} storageKey="standing" tabs={[
        {
          id: "active",
          label: "Active",
          count: active.length,
          content: active.length === 0 ? (
            s.standing.length === 0 ? (
              <div className="card empty"><ShieldCheck size={26} className="dim" /><div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No standing permissions yet</div><div className="small dim" style={{ maxWidth: 480, margin: "6px auto 0", lineHeight: 1.55 }}>Agents are governed by your rules and the Safety Kernel alone. Grant one to give an agent explicit everyday limits on a system, with an expiry.</div>{grantButton && <div style={{ marginTop: 14 }}>{grantButton}</div>}</div>
            ) : (
              <div className="card empty"><ShieldCheck size={26} className="dim" /><div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>No standing permission is in force</div><div className="small dim" style={{ maxWidth: 480, margin: "6px auto 0", lineHeight: 1.55 }}>Every one has been revoked or has expired, so every agent action on these systems needs a human yes. Grant one again from Revoked &amp; expired.</div></div>
            )
          ) : (
            <>
              <SectionHead title="Active permissions" sub="Who holds each one, what it allows, what it never allows, and what would change if you revoked it" />
              <CardGrid>{active.map(renderCard)}</CardGrid>
            </>
          ),
        },
        {
          id: "inactive",
          label: "Revoked & expired",
          count: inactive.length,
          content: inactive.length === 0 ? (
            <div className="card empty"><Ban size={26} className="dim" /><div style={{ fontWeight: 600, fontSize: 15, marginTop: 10 }}>Nothing revoked or expired</div><div className="small dim" style={{ maxWidth: 480, margin: "6px auto 0", lineHeight: 1.55 }}>A permission lands here the moment it is revoked or passes its expiry, and can be granted again from here.</div></div>
          ) : (
            <>
              <SectionHead title="Revoked & expired" sub="No longer in force: that agent's work on the system needs a human yes until the permission is granted again" />
              <CardGrid>{inactive.map(renderCard)}</CardGrid>
            </>
          ),
        },
      ]} />

      <div className="small faint row" style={{ gap: 6, marginTop: 16 }}>
        Inside a task, the task's own permission slip is the authority instead —
        <a className="row" style={{ gap: 4 }} onClick={() => nav("tasks")}>Tasks <ArrowRight size={13} /></a>
      </div>
    </div>
  );
}
