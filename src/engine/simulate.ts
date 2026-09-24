// ============================================================================
// Simulator — turns a Scenario into a SimulationEvent via the Core Brain,
// applying transforms (with Token Vault entries), building the evidence chain
// and the pipeline trace the Simulation Lab renders step by step.
// ============================================================================

import { decide, type ActionRequest } from "./brain";
import type { Scenario } from "./scenarios";
import type {
  DetectorFinding, EvidenceRecord, IntentContract, InspectionResult,
  SimulationEvent, TransformStep, VaultToken,
} from "../model/types";
import { detectorFor, destById } from "../model/registries";
import { agentById, resourceById, userById } from "../model/org";

let tokenCounter = 0;
export function setTokenCounter(n: number) { tokenCounter = n; }

function nextToken(dataClass: string): string {
  tokenCounter += 1;
  const family = dataClass.split(".").pop() ?? "DATA";
  return `${family}_TOKEN_${String(tokenCounter).padStart(3, "0")}`;
}

function simpleHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function buildInspection(sc: Scenario): InspectionResult | undefined {
  if (sc.uninspectable) {
    return { inspectable: false, reason: sc.uninspectable.reason, findings: [] };
  }
  if (!sc.findings || sc.findings.length === 0) {
    if (sc.payload !== undefined) {
      return { inspectable: true, parser: "text/plain", findings: [] };
    }
    return undefined;
  }
  const findings: DetectorFinding[] = sc.findings.map((f) => {
    const det = detectorFor(f.dataClass);
    return {
      dataClass: f.dataClass,
      detector: det?.id ?? "generic-v1",
      detectorVersion: det?.version ?? "1.0.0",
      confidence: f.dataClass.startsWith("CREDENTIAL.") ? 1.0 : f.dataClass === "PII.NAME" ? 0.94 : 0.99,
      sample: f.sample,
      count: f.count,
    };
  });
  const parser = sc.fileName?.endsWith(".csv") ? "csv-parser-v2"
    : sc.fileName?.endsWith(".yaml") ? "yaml-parser-v1"
    : sc.fileName?.endsWith(".json") ? "json-parser-v1"
    : sc.fileName ? "text-parser-v1" : "inline-text";
  return { inspectable: true, parser, findings };
}

// Apply a transform to the payload; returns transformed payload + steps + tokens.
function applyTransform(
  sc: Scenario,
  kind: string,
  classes: string[],
  eventId: string
): { after: string; steps: TransformStep[]; tokens: VaultToken[] } {
  const steps: TransformStep[] = [];
  const tokens: VaultToken[] = [];
  let after = sc.payload ?? "";

  const patterns: Record<string, RegExp> = {
    "PII.EMAIL": /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "PII.PHONE": /\+1 \d{3} \d{3} \d{4}/g,
    "CUSTOM.CUSTOMER_ID": /VRD-CUST-\d{4}/g,
    "FINANCIAL.ACCOUNT": /ACCT-\d{8}/g,
    "HR.COMPENSATION": /\$\d[\d,]*/g,
    "HEALTH.PHI": /MRN-\d+/g,
  };

  for (const cls of classes) {
    const re = patterns[cls];
    if (!re) continue;
    after = after.replace(re, (m) => {
      if (kind === "REVERSIBLE_TOKENIZE") {
        const tok = nextToken(cls);
        steps.push({ kind: "REVERSIBLE_TOKENIZE", dataClass: cls, before: m, after: tok, tokenId: tok });
        tokens.push({
          id: tok, dataClass: cls, createdAt: Date.now(),
          scope: `restore:${sc.destinationClass ?? "internal"}`,
          expiresAt: Date.now() + 30 * 24 * 3600 * 1000,
          restorable: true, eventId,
        });
        return tok;
      }
      if (kind === "REDACT") {
        const red = `[REDACTED:${cls.split(".").pop()}]`;
        steps.push({ kind: "REDACT", dataClass: cls, before: m, after: red });
        return red;
      }
      const masked = m.slice(0, 2) + "•".repeat(Math.max(0, m.length - 4)) + m.slice(-2);
      steps.push({ kind: "MASK", dataClass: cls, before: m, after: masked });
      return masked;
    });
  }
  return { after, steps, tokens };
}

export interface SimOutcome {
  event: SimulationEvent;
  tokens: VaultToken[];
}

let seq = 0;
export function setSeq(n: number) { seq = n; }
export function getSeq() { return seq; }

export function runScenario(
  sc: Scenario,
  contracts: IntentContract[],
  prevHash: string,
  opts?: { breakGlass?: boolean; timestamp?: number }
): SimOutcome {
  seq += 1;
  const id = `evt-${String(seq).padStart(5, "0")}`;
  const inspection = buildInspection(sc);

  const req: ActionRequest = {
    plane: sc.plane,
    action: sc.action,
    actionRaw: sc.actionRaw,
    agent: sc.agent,
    user: sc.user,
    resource: sc.resource,
    environment: sc.environment,
    destinationClass: sc.destinationClass,
    inspection,
    context: {
      environment: sc.environment,
      resourceSensitivity: sc.sensitivity,
      privileged: sc.privileged ?? false,
      businessHours: true,
    },
    blastRadius: sc.blast
      ? { ...sc.blast }
      : undefined,
    breakGlass: opts?.breakGlass,
  };

  const result = decide(req, contracts);

  let transformation: TransformStep[] | undefined;
  let payloadAfter: string | undefined;
  let tokens: VaultToken[] = [];
  if (result.decision === "CONSTRAIN" && result.transform && sc.payload) {
    const t = applyTransform(sc, result.transform, result.transformClasses, id);
    transformation = t.steps;
    payloadAfter = t.after;
    tokens = t.tokens;
  }

  const userN = userById(sc.user)?.name ?? sc.user;
  const agentN = agentById(sc.agent)?.name ?? sc.agent;
  const resN = resourceById(sc.resource)?.name ?? sc.resource;
  const destN = sc.destination ? destById(sc.destination)?.label ?? sc.destination : undefined;

  const chain: EvidenceRecord["chain"] = [
    { label: "User", detail: userN },
    { label: "Agent", detail: agentN },
    ...(sc.application ? [{ label: "Tool", detail: sc.application }] : []),
    { label: "Action", detail: `${sc.action}${sc.actionRaw ? ` — ${sc.actionRaw}` : ""}` },
    { label: "Resource", detail: resN },
    ...(inspection && inspection.inspectable && inspection.findings.length > 0
      ? [{ label: "Findings", detail: inspection.findings.map((f) => `${f.dataClass}×${f.count}`).join(", ") }]
      : []),
    ...(inspection && !inspection.inspectable
      ? [{ label: "Inspection", detail: `UNINSPECTABLE — ${inspection.reason}` }]
      : []),
    ...(destN ? [{ label: "Destination", detail: `${destN} (${sc.destinationClass})` }] : []),
    ...(result.safetyRules.length > 0
      ? [{ label: "Safety Kernel", detail: result.safetyRules.map((s) => s.name).join(", ") }]
      : []),
    ...(result.matchedContracts.length > 0
      ? [{ label: "Policy", detail: result.matchedContracts[0].clauseText }]
      : []),
    { label: "Decision", detail: result.decision },
    ...(transformation && transformation.length > 0
      ? [{ label: "Transform", detail: `${transformation.length} value(s) ${transformation[0].kind.toLowerCase().replaceAll("_", " ")}d` }]
      : []),
    { label: "Enforcement", detail: `${sc.plane} plane` },
  ];

  const ts = opts?.timestamp ?? Date.now();
  const hash = simpleHash(prevHash + id + result.decision + ts);

  const event: SimulationEvent = {
    id,
    seq,
    timestamp: ts,
    scenario: sc.id,
    user: sc.user,
    device: agentById(sc.agent)?.device ?? "d-daniel-mbp",
    agent: sc.agent,
    application: sc.application,
    plane: sc.plane,
    action: sc.action,
    actionRaw: sc.actionRaw,
    resource: sc.resource,
    environment: sc.environment,
    destination: sc.destination,
    destinationClass: sc.destinationClass,
    dataClasses: inspection?.findings.map((f) => f.dataClass) ?? [],
    inspection,
    matchedContracts: result.matchedContracts,
    safetyRules: result.safetyRules,
    context: req.context,
    blastRadius: req.blastRadius,
    capabilityState: inspection && !inspection.inspectable ? "UNINSPECTABLE" : "ENFORCED",
    decision: result.decision,
    decisionReasons: result.reasons,
    safeAlternative: result.safeAlternative,
    transformation,
    payloadBefore: sc.payload,
    payloadAfter,
    reviewState:
      result.decision === "REVIEW"
        ? {
            status: "pending",
            expiresAt: ts + 4 * 3600 * 1000,
            safeAlternative: result.safeAlternative,
          }
        : undefined,
    status:
      result.decision === "BLOCK" ? "blocked"
      : result.decision === "REVIEW" ? "pending_review"
      : result.decision === "CONSTRAIN" ? "transformed"
      : "completed",
    risk: result.risk,
    breakGlass: opts?.breakGlass && result.decision === "ALLOW" ? true : undefined,
    evidence: { eventId: id, hash, prevHash, chain },
  };

  return { event, tokens };
}

// Pipeline trace for animated Simulation Lab rendering.
export interface PipelineStage {
  key: string;
  label: string;
  detail: string;
  tone: "neutral" | "info" | "good" | "warn" | "bad";
}

export function pipelineFor(sc: Scenario, ev: SimulationEvent): PipelineStage[] {
  const stages: PipelineStage[] = [];
  const agentN = agentById(sc.agent)?.name ?? sc.agent;
  const destN = sc.destination ? destById(sc.destination)?.label : undefined;

  stages.push({
    key: "origin",
    label: sc.plane === "NETWORK" ? "Browser prepares request" : sc.plane === "ENDPOINT" ? "Agent issues local action" : "Agent calls gateway",
    detail: sc.actionRaw ?? `${agentN} → ${sc.action}`,
    tone: "neutral",
  });
  stages.push({
    key: "intercept",
    label:
      sc.plane === "NETWORK" ? "Wrapbox Network plane intercepts traffic"
      : sc.plane === "ENDPOINT" ? "Wrapbox Endpoint plane holds the action"
      : "Wrapbox Gateway receives the operation",
    detail: "Action normalized before anything executes",
    tone: "info",
  });
  if (sc.action !== "EXECUTE" || sc.findings) {
    stages.push({
      key: "normalize",
      label: "Action normalization",
      detail: `${sc.actionRaw ?? sc.action} → ${sc.action}`,
      tone: "info",
    });
  }
  if (ev.destinationClass) {
    stages.push({
      key: "dest",
      label: "Destination classification",
      detail: `${destN ?? "endpoint"} → ${ev.destinationClass}`,
      tone: ev.destinationClass === "UNKNOWN_EXTERNAL" || ev.destinationClass === "UNAPPROVED_AI" ? "warn" : "info",
    });
  }
  if (ev.inspection) {
    if (!ev.inspection.inspectable) {
      stages.push({ key: "inspect", label: "Content inspection", detail: `UNINSPECTABLE — ${ev.inspection.reason}`, tone: "warn" });
    } else if (ev.inspection.findings.length > 0) {
      stages.push({
        key: "inspect",
        label: `Content inspection (${ev.inspection.parser})`,
        detail: ev.inspection.findings.map((f) => `${f.dataClass} ×${f.count} (${f.detector}, ${(f.confidence * 100).toFixed(0)}%)`).join(" · "),
        tone: "warn",
      });
    } else {
      stages.push({ key: "inspect", label: "Content inspection", detail: "No sensitive findings", tone: "good" });
    }
  }
  if (ev.blastRadius) {
    stages.push({ key: "blast", label: "Blast-radius assessment", detail: ev.blastRadius.label, tone: ev.blastRadius.severity === "low" ? "info" : "warn" });
  }
  stages.push({
    key: "brain",
    label: "Core Brain evaluation",
    detail:
      ev.safetyRules.length > 0
        ? `Safety Kernel: ${ev.safetyRules.map((s) => s.name).join(", ")}`
        : ev.matchedContracts.length > 0
          ? `Matched: "${ev.matchedContracts[0].clauseText}"`
          : "No contract matched; default + safety evaluation",
    tone: "info",
  });
  stages.push({
    key: "decision",
    label: `Decision: ${ev.decision}`,
    detail: ev.decisionReasons[0] ?? "",
    tone: ev.decision === "ALLOW" ? "good" : ev.decision === "CONSTRAIN" ? "info" : ev.decision === "REVIEW" ? "warn" : "bad",
  });
  if (ev.transformation && ev.transformation.length > 0) {
    stages.push({
      key: "transform",
      label: `Transform applied: ${ev.transformation[0].kind}`,
      detail: ev.transformation.slice(0, 3).map((t) => `${t.before} → ${t.after}`).join(" · ") + (ev.transformation.length > 3 ? ` +${ev.transformation.length - 3} more` : ""),
      tone: "info",
    });
  }
  stages.push({
    key: "outcome",
    label:
      ev.decision === "BLOCK" ? "Blocked before execution"
      : ev.decision === "REVIEW" ? "Parked pending review"
      : ev.decision === "CONSTRAIN" ? "Safe payload continues to destination"
      : "Action proceeds",
    detail:
      ev.decision === "BLOCK"
        ? (ev.plane === "NETWORK" ? "Destination did NOT receive the data" : "The action never executed")
        : ev.decision === "REVIEW" ? "Waiting in Review Center; independent work continues"
        : ev.decision === "CONSTRAIN" ? "Original values never left the device"
        : "Executed within policy",
    tone: ev.decision === "ALLOW" || ev.decision === "CONSTRAIN" ? "good" : ev.decision === "REVIEW" ? "warn" : "bad",
  });
  stages.push({
    key: "evidence",
    label: "Evidence recorded",
    detail: `${ev.id} · chain hash ${ev.evidence.hash}`,
    tone: "neutral",
  });
  return stages;
}
