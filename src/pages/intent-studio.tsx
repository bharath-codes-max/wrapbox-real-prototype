// Intent Studio — natural-language Intent Contracts plus compiled machine view,
// coverage status, simulation and activation. Includes Policy Autopilot
// (recommend only — never silently activates wider authority).
import { useState } from "react";
import { useAppState, upsertContract, setContractStatus, setAutopilotStatus } from "../state/store";
import { PageHead, SectionHead, Stat, Chip, StatusChip, SimNote, Drawer, DecisionChip } from "../ui/kit";
import { CAPABILITIES } from "../model/registries";
import { userById } from "../model/org";
import type { ContractClause } from "../model/types";
import { draftClauses, coverageRollup } from "../engine/drafter";
import { contractCoverage, destinationText } from "../engine/coverage";
import { FileText, FileCheck2, ShieldCheck, Sparkles, Wand2, ArrowRight } from "lucide-react";


/** A rule's conditions in plain words: what, where to, and only-in (context). */
function ClauseFacts({ cl }: { cl: ContractClause }) {
  const env = cl.environments?.length ? cl.environments.join(", ") : "any environment";
  return (
    <dl className="clause-facts">
      <dt>What</dt>
      <dd className="row" style={{ gap: 4 }}>
        {cl.dataClasses.length ? cl.dataClasses.map((d) => <Chip key={d} tone="violet">{d}</Chip>) : <span className="faint">any data</span>}
        <span className="faint">· {cl.actions === "ANY" ? "any action" : cl.actions.join(" / ")}</span>
      </dd>
      <dt>Where to</dt><dd>{cl.destinations === "ANY" ? <span className="faint">anywhere</span> : destinationText(cl.destinations)}</dd>
      <dt>Only in</dt>
      <dd>{cl.environments?.length ? <Chip tone="review">{env}</Chip> : <span className="faint">{env}</span>}</dd>
      {(cl.transform || cl.failClosed) && (
        <>
          <dt>Also</dt>
          <dd className="row" style={{ gap: 4 }}>
            {cl.transform && <Chip tone="constrain">{cl.transform}</Chip>}
            {cl.failClosed && <Chip tone="critical">fail closed</Chip>}
          </dd>
        </>
      )}
    </dl>
  );
}

export function IntentStudio({ nav }: { nav: (r: string) => void; route: string }) {
  const s = useAppState();
  const [open, setOpen] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draftName, setDraftName] = useState("New contract");
  const [draftText, setDraftText] = useState(
    "Employees may use approved AI services for normal business work. Customer email addresses and phone numbers must be reversibly tokenized before transmission to external AI. Credentials must never be transmitted externally."
  );
  const [preview, setPreview] = useState<ContractClause[] | null>(null);
  const contract = open ? s.contracts.find((c) => c.id === open) : null;

  const activeCount = s.contracts.filter((c) => c.status === "ACTIVE").length;
  const draftCount = s.contracts.filter((c) => c.status === "DRAFT").length;
  const enforcedCount = s.contracts.filter((c) => contractCoverage(c) === "ENFORCED").length;
  const openRecs = s.autopilot.filter((a) => a.status === "open");
  const acceptedRecs = s.autopilot.filter((a) => a.status === "accepted").length;
  const dismissedRecs = s.autopilot.filter((a) => a.status === "dismissed").length;

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="Policy"
        title="Intent Studio"
        sub="Enterprise intent in natural language, compiled to an enforceable machine representation. A contract only claims the coverage its required capabilities truthfully provide."
        right={<button className="btn btn-primary" onClick={() => { setDrafting(true); setPreview(null); }}>+ Draft contract</button>}
      />

      <div className="grid g4">
        <Stat icon={<FileText size={17} />} label="Contracts" value={s.contracts.length} note="natural-language intent, compiled" />
        <Stat icon={<FileCheck2 size={17} />} label="Active" value={activeCount} tone="good" note={draftCount > 0 ? `${draftCount} draft(s) pending` : "no drafts pending"} />
        <Stat icon={<ShieldCheck size={17} />} label="Fully enforced" value={enforcedCount} tone={enforcedCount === s.contracts.length ? "good" : "info"} note="coverage backed by live capabilities" />
        <Stat icon={<Sparkles size={17} />} label="Open recommendations" value={openRecs.length} tone={openRecs.length > 0 ? "warn" : "good"} note="from Policy Autopilot" />
      </div>

      <div className="section">
        <SectionHead title="Intent Contracts" sub="Each row is authored intent compiled to enforceable clauses — open one to inspect its machine representation" />
        <div className="card card-pad-0">
          <table className="tbl">
            <thead><tr><th>Contract</th><th>Author</th><th>Clauses</th><th>Coverage</th><th>Status</th><th>Version</th></tr></thead>
            <tbody>
              {s.contracts.map((c) => (
                <tr key={c.id} className="rowlink" onClick={() => setOpen(c.id)}>
                  <td><b>{c.name}</b><div className="small faint" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sourceText}</div></td>
                  <td className="small">{userById(c.author)?.name}</td>
                  <td className="mono">{c.clauses.length}</td>
                  <td><StatusChip s={contractCoverage(c)} /></td>
                  <td><Chip tone={c.status === "ACTIVE" ? "allow" : c.status === "DRAFT" ? "neutral" : "block"}>{c.status}</Chip></td>
                  <td className="mono small">v{c.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Autopilot */}
      <div className="section">
        <SectionHead title="Policy Autopilot" sub="Recommendations from observed behavior — acceptance creates a DRAFT for human activation; nothing activates silently" />
        {openRecs.length === 0 && (
          <div className="card empty"><Wand2 size={18} className="dim" /><div>No open recommendations.</div></div>
        )}
        {openRecs.length > 0 && (
          <div className="grid g2">
            {openRecs.map((a) => (
              <div className="card" key={a.id}>
                <div className="row"><Sparkles size={16} className="dim" /><span className="small dim">Observed across {a.basedOnEvents.toLocaleString()} events</span></div>
                <div style={{ margin: "10px 0" }}>{a.observation}</div>
                <div className="small"><b>Recommendation:</b> {a.recommendation}</div>
                <div className="row" style={{ marginTop: 14 }}>
                  <button className="btn btn-sm btn-good" onClick={() => setAutopilotStatus(a.id, "accepted")}>Accept</button>
                  <button className="btn btn-sm" onClick={() => setAutopilotStatus(a.id, "modified")}>Modify</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setAutopilotStatus(a.id, "dismissed")}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {s.autopilot.some((a) => a.status !== "open") && (
          <div className="small faint" style={{ marginTop: 12 }}>
            {acceptedRecs} accepted · {dismissedRecs} dismissed — acceptance creates a DRAFT for human activation; nothing activates silently.
          </div>
        )}
      </div>

      {/* Contract detail */}
      {contract && (
        <Drawer onClose={() => setOpen(null)}>
          <div className="spread">
            <h2 style={{ fontSize: 16 }}>{contract.name}</h2>
            <div className="row">
              <StatusChip s={contractCoverage(contract)} />
              <Chip tone={contract.status === "ACTIVE" ? "allow" : "neutral"}>{contract.status}</Chip>
            </div>
          </div>
          <div className="small dim" style={{ margin: "6px 0 12px" }}>
            v{contract.version} · {userById(contract.author)?.name} · {new Date(contract.createdAt).toLocaleDateString()}
          </div>
          <div className="card" style={{ background: "var(--bg-inset)", fontStyle: "italic" }}>
            “{contract.sourceText}”
          </div>
          <h3 style={{ fontSize: 13, margin: "14px 0 8px" }}>Compiled clauses</h3>
          {contract.clauses.map((cl) => (
            <div className="card" key={cl.id} style={{ marginBottom: 8, padding: "10px 12px" }}>
              <div className="spread">
                <span className="small">“{cl.text}”</span>
                <DecisionChip d={cl.effect} small />
              </div>
              <ClauseFacts cl={cl} />
              <div className="row small faint" style={{ marginTop: 6 }}>
                requires:{" "}
                {cl.requiredCapabilities.map((cap) => {
                  const c = CAPABILITIES.find((x) => x.id === cap);
                  return <span key={cap}>{c?.label ?? cap} <StatusChip s={c?.status ?? "PENDING"} /></span>;
                })}
              </div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 12 }}>
            {contract.status !== "ACTIVE" && (
              <button
                className="btn btn-good btn-sm"
                onClick={() => setContractStatus(contract.id, "ACTIVE")}
                disabled={contractCoverage(contract) === "PENDING"}
                title={contractCoverage(contract) === "PENDING" ? "Required capability is PENDING — activation would create a false security claim" : ""}
              >
                Activate
              </button>
            )}
            {contract.status === "ACTIVE" && (
              <button className="btn btn-danger btn-sm" onClick={() => setContractStatus(contract.id, "DEACTIVATED")}>Deactivate</button>
            )}
            <button className="btn btn-sm" onClick={() => { setOpen(null); nav("simulator"); }}>Simulate impact <ArrowRight size={13} /></button>
          </div>
          {(() => {
            const cov = contractCoverage(contract);
            if (cov === "ENFORCED") return null;
            const weak = [...new Set(contract.clauses.flatMap((cl) => cl.requiredCapabilities))]
              .map((id) => CAPABILITIES.find((c) => c.id === id))
              .filter((c) => c && c.status !== "ENFORCED")
              .map((c) => `${c!.label} (${c!.status.replaceAll("_", " ").toLowerCase()})`);
            return (
              <div className="small" style={{ color: "var(--warn)", marginTop: 8 }}>
                {cov === "PENDING"
                  ? contract.status === "ACTIVE"
                    ? "A required skill is missing — this contract cannot be fully kept."
                    : "Can't be switched on: a required skill is missing. Wrapbox will not claim protection it cannot deliver."
                  : "Enforced with reduced confidence — shown honestly, not hidden."}
                {weak.length > 0 && <> Weak skills: {weak.join(", ")}.</>}
              </div>
            );
          })()}
        </Drawer>
      )}

      {/* Drafting */}
      {drafting && (
        <Drawer onClose={() => setDrafting(false)}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>Draft Intent Contract</h2>
          <div className="field" style={{ marginBottom: 10 }}>
            <label className="field-label">Name</label>
            <input className="input" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Intent (natural language)</label>
            <textarea className="input" rows={5} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setPreview(draftClauses(draftText))}>Compile</button>
            <SimNote>Deterministic pattern compiler — the product compiles via Policy IR</SimNote>
          </div>
          {preview && (
            <>
              <h3 style={{ fontSize: 13, margin: "14px 0 8px" }}>Compiled preview</h3>
              {preview.map((cl) => (
                <div className="card" key={cl.id} style={{ marginBottom: 8, padding: "10px 12px" }}>
                  <div className="spread">
                    <span className="small">“{cl.text}”</span>
                    <DecisionChip d={cl.effect} small />
                  </div>
                  <div className="row small" style={{ marginTop: 6 }}>
                    {cl.dataClasses.map((d) => <Chip key={d} tone="violet">{d}</Chip>)}
                    {cl.transform && <Chip tone="constrain">{cl.transform}</Chip>}
                    {cl.failClosed && <Chip tone="critical">fail closed</Chip>}
                  </div>
                </div>
              ))}
              <div className="small dim" style={{ margin: "8px 0" }}>
                Coverage rollup: <StatusChip s={coverageRollup(preview)} />
              </div>
              <button
                className="btn btn-good"
                onClick={() => {
                  upsertContract({
                    id: `ic-${Date.now().toString(36)}`,
                    name: draftName,
                    author: "u-priya",
                    createdAt: Date.now(),
                    version: 1,
                    status: "DRAFT",
                    sourceText: draftText,
                    clauses: preview,
                    coverage: coverageRollup(preview),
                  });
                  setDrafting(false);
                }}
              >
                Save as draft
              </button>
            </>
          )}
        </Drawer>
      )}
    </div>
  );
}
