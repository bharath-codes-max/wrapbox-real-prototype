// Intent Studio — natural-language Intent Contracts plus compiled machine view,
// coverage status, simulation and activation. Includes Policy Autopilot
// (recommend only — never silently activates wider authority).
import { useState } from "react";
import { useAppState, upsertContract, setContractStatus, setAutopilotStatus } from "../state/store";
import { PageHead, Chip, StatusChip, SimNote, Drawer, DecisionChip } from "../ui/kit";
import { CAPABILITIES } from "../model/registries";
import { userById } from "../model/org";
import type { ContractClause, IntentContract } from "../model/types";

// Deterministic clause extractor for the drafting demo (simulated compiler —
// pattern-driven, predictable; the real product compiles through the Policy IR).
function draftClauses(text: string): ContractClause[] {
  const clauses: ContractClause[] = [];
  const sentences = text.split(/(?<=\.)\s+/).filter((x) => x.trim().length > 4);
  let i = 0;
  for (const sRaw of sentences) {
    const s = sRaw.toLowerCase();
    i += 1;
    const dataClasses: string[] = [];
    if (s.includes("email")) dataClasses.push("PII.EMAIL");
    if (s.includes("phone")) dataClasses.push("PII.PHONE");
    if (s.includes("credential") || s.includes("secret") || s.includes("api key") || s.includes("password")) {
      dataClasses.push("CREDENTIAL.API_KEY", "CREDENTIAL.PRIVATE_KEY", "CREDENTIAL.PASSWORD");
    }
    if (s.includes("source code") || s.includes("code")) dataClasses.push("SOURCE_CODE");
    if (s.includes("customer id") || s.includes("customer identifier")) dataClasses.push("CUSTOM.CUSTOMER_ID");
    if (s.includes("compensation") || s.includes("salary")) dataClasses.push("HR.COMPENSATION");
    if (s.includes("health") || s.includes("phi") || s.includes("patient")) dataClasses.push("HEALTH.PHI");
    if (s.includes("card")) dataClasses.push("PCI.CARD");

    let effect: ContractClause["effect"] = "ALLOW";
    let transform: ContractClause["transform"];
    if (s.includes("tokeniz")) { effect = "CONSTRAIN"; transform = "REVERSIBLE_TOKENIZE"; }
    else if (s.includes("redact")) { effect = "CONSTRAIN"; transform = "REDACT"; }
    else if (s.includes("never") || s.includes("must not") || s.includes("forbidden") || s.includes("block")) effect = "BLOCK";
    else if (s.includes("review") || s.includes("approval") || s.includes("approve")) effect = "REVIEW";

    const destinations: ContractClause["destinations"] =
      s.includes("external ai") || s.includes("external") ? ["APPROVED_AI", "UNAPPROVED_AI", "GENERIC_EXTERNAL", "UNKNOWN_EXTERNAL", "PARTNER"]
      : s.includes("approved ai") ? ["APPROVED_AI"]
      : "ANY";

    const actions: ContractClause["actions"] =
      s.includes("transmi") || s.includes("upload") || s.includes("send") || s.includes("leave") ? ["NETWORK_SEND", "DATA_EXPORT"]
      : s.includes("read") ? ["READ", "SECRET_ACCESS"]
      : s.includes("deploy") ? ["DEPLOY"]
      : s.includes("delete") || s.includes("destructive") ? ["DELETE"]
      : "ANY";

    clauses.push({
      id: `cl-draft-${i}`,
      text: sRaw.trim().replace(/\.$/, ""),
      dataClasses,
      destinations,
      actions,
      effect,
      transform,
      requiredCapabilities: dataClasses.some((d) => d.startsWith("HEALTH.")) ? ["cap-ocr", "cap-net-file"]
        : dataClasses.some((d) => d.startsWith("HR.") || d.startsWith("LEGAL.")) ? ["cap-semantic", "cap-net-file"]
        : ["cap-net-file"],
      failClosed: effect !== "ALLOW",
    });
  }
  return clauses;
}

function coverageRollup(clauses: ContractClause[]): IntentContract["coverage"] {
  const capState = (id: string) => CAPABILITIES.find((c) => c.id === id)?.status ?? "PENDING";
  let worst: IntentContract["coverage"] = "ENFORCED";
  const rank = { ENFORCED: 0, DEGRADED: 1, UNDERSTOOD_ONLY: 2, PENDING: 3, UNINSPECTABLE: 3 };
  for (const cl of clauses) {
    for (const cap of cl.requiredCapabilities) {
      const st = capState(cap);
      const mapped = st === "UNINSPECTABLE" ? "PENDING" : st;
      if (rank[mapped] > rank[worst]) worst = mapped;
    }
  }
  return worst;
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

  return (
    <div className="page">
      <PageHead
        title="Intent Studio"
        sub="Enterprise intent in natural language, compiled to an enforceable machine representation. A contract only claims the coverage its required capabilities truthfully provide."
        right={<button className="btn btn-primary" onClick={() => { setDrafting(true); setPreview(null); }}>+ Draft contract</button>}
      />

      <div className="card" style={{ padding: 0 }}>
        <table className="tbl">
          <thead><tr><th>Contract</th><th>Author</th><th>Clauses</th><th>Coverage</th><th>Status</th><th>Version</th></tr></thead>
          <tbody>
            {s.contracts.map((c) => (
              <tr key={c.id} className="rowlink" onClick={() => setOpen(c.id)}>
                <td><b>{c.name}</b><div className="small faint" style={{ maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.sourceText}</div></td>
                <td className="small">{userById(c.author)?.name}</td>
                <td className="mono">{c.clauses.length}</td>
                <td><StatusChip s={c.coverage} /></td>
                <td><Chip tone={c.status === "ACTIVE" ? "allow" : c.status === "DRAFT" ? "neutral" : "block"}>{c.status}</Chip></td>
                <td className="mono small">v{c.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Policy Autopilot */}
      <h2 style={{ fontSize: 14, margin: "22px 0 8px" }}>Policy Autopilot <span className="faint small">— recommendations from observed behavior · never auto-activates</span></h2>
      {s.autopilot.filter((a) => a.status === "open").length === 0 && (
        <div className="card empty">No open recommendations.</div>
      )}
      {s.autopilot.filter((a) => a.status === "open").map((a) => (
        <div className="card" key={a.id}>
          <div className="small dim">Observed across {a.basedOnEvents.toLocaleString()} events:</div>
          <div style={{ margin: "4px 0" }}>{a.observation}</div>
          <div className="small"><b>Recommendation:</b> {a.recommendation}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn btn-sm btn-good" onClick={() => setAutopilotStatus(a.id, "accepted")}>Accept</button>
            <button className="btn btn-sm" onClick={() => setAutopilotStatus(a.id, "modified")}>Modify</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setAutopilotStatus(a.id, "dismissed")}>Dismiss</button>
          </div>
        </div>
      ))}
      {s.autopilot.some((a) => a.status !== "open") && (
        <div className="small faint" style={{ marginTop: 6 }}>
          {s.autopilot.filter((a) => a.status === "accepted").length} accepted · {s.autopilot.filter((a) => a.status === "dismissed").length} dismissed — acceptance creates a DRAFT for human activation; nothing activates silently.
        </div>
      )}

      {/* Contract detail */}
      {contract && (
        <Drawer onClose={() => setOpen(null)}>
          <div className="spread">
            <h2 style={{ fontSize: 16 }}>{contract.name}</h2>
            <div className="row">
              <StatusChip s={contract.coverage} />
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
              <div className="row small" style={{ marginTop: 6 }}>
                {cl.dataClasses.map((d) => <Chip key={d} tone="violet">{d}</Chip>)}
                <Chip tone="neutral">{cl.actions === "ANY" ? "any action" : cl.actions.join(" / ")}</Chip>
                <Chip tone="neutral">{cl.destinations === "ANY" ? "any destination" : `${cl.destinations.length} destination classes`}</Chip>
                {cl.transform && <Chip tone="constrain">{cl.transform}</Chip>}
                {cl.failClosed && <Chip tone="critical">fail closed</Chip>}
              </div>
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
                disabled={contract.coverage === "PENDING"}
                title={contract.coverage === "PENDING" ? "Required capability is PENDING — activation would create a false security claim" : ""}
              >
                Activate
              </button>
            )}
            {contract.status === "ACTIVE" && (
              <button className="btn btn-danger btn-sm" onClick={() => setContractStatus(contract.id, "DEACTIVATED")}>Deactivate</button>
            )}
            <button className="btn btn-sm" onClick={() => { setOpen(null); nav("simulator"); }}>Simulate impact →</button>
          </div>
          {contract.coverage === "PENDING" && contract.status !== "ACTIVE" && (
            <div className="small" style={{ color: "var(--warn)", marginTop: 8 }}>
              Activation gated: a required capability is PENDING. Wrapbox will not claim enforcement it cannot deliver.
            </div>
          )}
          {contract.coverage === "DEGRADED" && (
            <div className="small" style={{ color: "var(--warn)", marginTop: 8 }}>
              Coverage DEGRADED: the semantic classifier is still improving. Decisions are enforced with reduced confidence — shown honestly, not hidden.
            </div>
          )}
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
