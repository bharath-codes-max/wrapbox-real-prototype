// ============================================================================
// Core Brain — the single deterministic decision engine.
// Every plane (Endpoint / Network / Gateway) calls decide() with a normalized
// ActionRequest. Precedence (blueprint §Week-3):
//   explicit enterprise forbid (BLOCK clause)
//   > safety invariant (Safety Kernel)
//   > enterprise constrain
//   > enterprise review
//   > blast-radius governor
//   > context escalation
//   > enterprise permit / default
// UNINSPECTABLE content with an applicable fail-closed protected clause fails
// closed — inability to inspect is never "clean".
// ============================================================================

import type {
  ActionVerb, BlastRadius, ContractClause, Decision, DestinationClass,
  DecidedBy, Environment, EventContext, IntentContract, InspectionResult, MatchedClause,
  SafetyRuleHit, TaskEnvelope, TransformKind,
} from "../model/types";
import { BASELINE_KERNEL, kernelHits, type KernelFacts, type KernelState } from "./kernel";

export interface ActionRequest {
  plane: "ENDPOINT" | "NETWORK" | "GATEWAY";
  action: ActionVerb;
  actionRaw?: string;
  agent: string;
  user: string;
  resource: string;
  environment: Environment;
  destinationClass?: DestinationClass;
  inspection?: InspectionResult; // content inspection result if content involved
  context: EventContext;
  blastRadius?: BlastRadius;
  envelope?: TaskEnvelope | null;
  breakGlass?: boolean;
  kernel?: KernelState; // installed Safety Kernel pack (defaults to the baseline)
  now?: number; // decision time (observe windows)
}

export interface BrainResult {
  decision: Decision;
  reasons: string[];
  matchedContracts: MatchedClause[];
  safetyRules: SafetyRuleHit[];
  safetyObserved: SafetyRuleHit[]; // observe-mode kernel rules that would have fired
  decidedBy: DecidedBy;
  transform?: TransformKind;
  transformClasses: string[];
  safeAlternative?: string;
  risk: "low" | "moderate" | "high" | "critical";
}

// ---------------------------------------------------------------------------
// Safety Kernel — the Wrapbox-managed, versioned rule pack lives in kernel.ts.
// Enforcing rules change the decision; observing rules (just installed from
// an update) are recorded as "would have blocked" only.
// ---------------------------------------------------------------------------

function kernelFacts(req: ActionRequest): KernelFacts {
  return {
    action: req.action,
    actionRaw: req.actionRaw,
    environment: req.environment,
    destinationClass: req.destinationClass,
    dataClasses: req.inspection?.findings.map((f) => f.dataClass) ?? [],
    sensitivity: req.context.resourceSensitivity,
    rows: req.blastRadius?.rows,
    severity: req.blastRadius?.severity,
  };
}

// ---------------------------------------------------------------------------
// Blast-Radius Governor — quantitative thresholds (blueprint §26).
// ---------------------------------------------------------------------------

export const BLAST_LIMITS = {
  files: 25,
  rows: 500,
  exportRows: 500, // above → review; ≥100k → safety kernel mass export
  spendUsd: 20,
  recipients: 20,
};

function blastGovernor(req: ActionRequest): { escalate: Decision | null; reason?: string } {
  const b = req.blastRadius;
  if (!b) return { escalate: null };
  if (b.files !== undefined && b.files > BLAST_LIMITS.files) {
    return { escalate: "REVIEW", reason: `File-change budget exceeded: ${b.files} > ${BLAST_LIMITS.files} files` };
  }
  if (b.rows !== undefined && req.action === "DATA_EXPORT" && b.rows > BLAST_LIMITS.exportRows) {
    return {
      escalate: b.rows >= 100_000 ? "BLOCK" : "REVIEW",
      reason: `Row export exceeds budget: ${fmt(b.rows)} > ${BLAST_LIMITS.exportRows} rows`,
    };
  }
  if (b.rows !== undefined && req.action === "READ" && b.rows > BLAST_LIMITS.rows) {
    return { escalate: "REVIEW", reason: `Row read exceeds budget: ${fmt(b.rows)} > ${BLAST_LIMITS.rows} rows` };
  }
  if (b.spendUsd !== undefined && b.spendUsd > BLAST_LIMITS.spendUsd) {
    return { escalate: "REVIEW", reason: `Cloud spend exceeds budget: $${fmt(b.spendUsd)} > $${BLAST_LIMITS.spendUsd}` };
  }
  if (b.recipients !== undefined && b.recipients > BLAST_LIMITS.recipients) {
    return {
      escalate: b.recipients >= 1000 ? "BLOCK" : "REVIEW",
      reason: `Recipient count exceeds budget: ${fmt(b.recipients)} > ${BLAST_LIMITS.recipients}`,
    };
  }
  return { escalate: null };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

// ---------------------------------------------------------------------------
// Contract matching
// ---------------------------------------------------------------------------

function clauseMatches(cl: ContractClause, req: ActionRequest, classes: string[]): boolean {
  if (cl.actions !== "ANY" && !cl.actions.includes(req.action)) return false;
  if (cl.environments && !cl.environments.includes(req.environment)) return false;
  if (cl.destinations !== "ANY") {
    if (!req.destinationClass) {
      // Destination-scoped clauses only apply to flows that have a destination
      if (req.action === "NETWORK_SEND" || req.action === "DATA_EXPORT") return false;
      // Endpoint clauses (e.g. secret read) list destinations "ANY" normally;
      // a destination-scoped clause without a destination in request: no match
      return false;
    }
    if (!cl.destinations.includes(req.destinationClass)) return false;
  }
  if (cl.dataClasses.length > 0) {
    if (!classes.some((c) => cl.dataClasses.includes(c))) return false;
  }
  return true;
}

// Does a protected (fail-closed) clause *potentially* apply if we cannot
// inspect content? Match everything except data classes.
function protectedClausePotentiallyApplies(cl: ContractClause, req: ActionRequest): boolean {
  if (!cl.failClosed || cl.dataClasses.length === 0) return false;
  if (cl.actions !== "ANY" && !cl.actions.includes(req.action)) return false;
  if (cl.environments && !cl.environments.includes(req.environment)) return false;
  if (cl.destinations !== "ANY") {
    if (!req.destinationClass) return false;
    if (!cl.destinations.includes(req.destinationClass)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// decide() — the single decision function.
// ---------------------------------------------------------------------------

const DECISION_RANK: Record<Decision, number> = { ALLOW: 0, CONSTRAIN: 1, REVIEW: 2, BLOCK: 3 };

export function decide(req: ActionRequest, contracts: IntentContract[]): BrainResult {
  const reasons: string[] = [];
  const matched: MatchedClause[] = [];
  const classes = req.inspection?.inspectable
    ? req.inspection.findings.map((f) => f.dataClass)
    : [];

  const active = contracts.filter((c) => c.status === "ACTIVE");

  // 0. Break-glass: scoped emergency override downgrades REVIEW/BLOCK → ALLOW
  //    with loud evidence, applied at the END so reasons still show.

  // 1. UNINSPECTABLE + applicable fail-closed protected clause → fail closed.
  if (req.inspection && !req.inspection.inspectable) {
    const applicable = active.flatMap((c) =>
      c.clauses.filter((cl) => protectedClausePotentiallyApplies(cl, req)).map((cl) => ({ c, cl }))
    );
    if (applicable.length > 0) {
      for (const { c, cl } of applicable) {
        matched.push({ contractId: c.id, contractName: c.name, clauseId: cl.id, clauseText: cl.text, effect: cl.effect });
      }
      reasons.push(
        `Content is UNINSPECTABLE (${req.inspection.reason ?? "unknown format"}) and a protected requirement applies — failing closed.`
      );
      return finish(req, {
        decision: "BLOCK", reasons, matchedContracts: matched, safetyRules: [], safetyObserved: [],
        decidedBy: { layer: "uninspectable", label: `Fail closed — content could not be inspected (${req.inspection.reason ?? "unknown format"})` },
        transformClasses: [], risk: "high",
        safeAlternative: "Provide the content in an inspectable format, or request a scoped exception.",
      });
    }
    reasons.push(`Content is UNINSPECTABLE (${req.inspection.reason ?? "unknown"}); no protected clause applies to this flow.`);
  }

  // 2. Collect matched clauses.
  let contractDecision: Decision = "ALLOW";
  let transform: TransformKind | undefined;
  let transformClasses: string[] = [];
  let safeAlternative: string | undefined;

  for (const c of active) {
    for (const cl of c.clauses) {
      if (!clauseMatches(cl, req, classes)) continue;
      matched.push({ contractId: c.id, contractName: c.name, clauseId: cl.id, clauseText: cl.text, effect: cl.effect });
      if (DECISION_RANK[cl.effect] > DECISION_RANK[contractDecision]) {
        contractDecision = cl.effect;
      }
      if (cl.effect === "CONSTRAIN" && cl.transform) {
        transform = cl.transform;
        transformClasses = [...new Set([...transformClasses, ...cl.dataClasses.filter((dc) => classes.includes(dc))])];
      }
      if (cl.effect === "BLOCK") {
        reasons.push(`Enterprise forbid: "${cl.text}" (${c.name})`);
      } else if (cl.effect === "REVIEW") {
        reasons.push(`Enterprise review requirement: "${cl.text}" (${c.name})`);
      } else if (cl.effect === "CONSTRAIN") {
        reasons.push(`Enterprise constraint: "${cl.text}" (${c.name})`);
      }
    }
  }

  // Which contract clause produced contractDecision: the first matched clause
  // carrying the highest-ranked effect (matching the max() above).
  const topClause = matched.find((m) => m.effect === contractDecision);
  let decidedBy: DecidedBy = topClause
    ? { layer: "contract", clauseId: topClause.clauseId, label: `"${topClause.clauseText}" (${topClause.contractName})` }
    : { layer: "default", label: "No rule restricts this action" };

  // 3. Safety Kernel.
  const { enforced: safety, observed: safetyObserved } = kernelHits(kernelFacts(req), req.kernel ?? BASELINE_KERNEL, req.now ?? Date.now());
  for (const s of safety) reasons.push(`Safety Kernel: ${s.name} — ${s.description}`);
  for (const s of safetyObserved) reasons.push(`Safety Kernel (observing, not enforced yet): ${s.name} would have blocked this.`);

  // 4. Combine per precedence: explicit forbid > safety invariant > constrain > review.
  //    An explicit enterprise BLOCK keeps the credit when both apply.
  let decision: Decision = contractDecision;
  if (safety.length > 0 && decision !== "BLOCK") {
    decision = "BLOCK";
    decidedBy = { layer: "safety", ruleId: safety[0].ruleId, label: `Safety Kernel — ${safety[0].name}` };
  }

  // 5. Blast-Radius Governor (cannot downgrade, only escalate).
  const blast = blastGovernor(req);
  if (blast.escalate && DECISION_RANK[blast.escalate] > DECISION_RANK[decision]) {
    decision = blast.escalate;
    decidedBy = { layer: "blast", label: `Blast-Radius Governor — ${blast.reason}` };
    reasons.push(`Blast-Radius Governor: ${blast.reason}`);
  } else if (blast.reason) {
    reasons.push(`Blast-Radius Governor noted: ${blast.reason}`);
  }

  // 6. Context escalation: privileged/production sensitivity raises risk;
  //    destructive verbs in production without explicit clause still review.
  if (
    decision === "ALLOW" &&
    req.environment === "production" &&
    (req.action === "DELETE" || req.action === "DEPLOY" || req.action === "PERMISSION_CHANGE")
  ) {
    decision = "REVIEW";
    decidedBy = { layer: "context", label: `Context Engine — ${req.action} in production requires authorization` };
    reasons.push(
      `Context Engine: ${req.action} in production against ${req.context.resourceSensitivity} resource requires authorization.`
    );
  }

  // 7. Task Envelope: outside-envelope actions escalate.
  if (req.envelope && req.envelope.status === "active") {
    const env = req.envelope;
    const resourceAllowed = env.allowedResources.some((r) => req.resource.includes(r) || r.includes(req.resource));
    const actionAllowed = env.allowedActions.includes(req.action);
    const forbidden = env.forbidden.some((f) => req.resource.toLowerCase().includes(f.toLowerCase()) || req.environment === f);
    if (forbidden) {
      if (DECISION_RANK[decision] < DECISION_RANK.REVIEW) {
        decision = "REVIEW";
        decidedBy = { layer: "envelope", label: `Task Envelope — "${req.resource}" is in forbidden scope` };
      }
      if (DECISION_RANK[decision] < DECISION_RANK.BLOCK) {
        reasons.push(`Task Envelope: "${req.resource}" is outside the envelope for task "${env.title}" (forbidden scope).`);
      }
    } else if (!resourceAllowed || !actionAllowed) {
      if (decision === "ALLOW") {
        decision = "REVIEW";
        decidedBy = { layer: "envelope", label: `Task Envelope — ${req.action} on ${req.resource} is outside the envelope` };
        reasons.push(`Task Envelope: ${req.action} on ${req.resource} exceeds envelope scope for "${env.title}" — re-authorization required.`);
      }
    }
    if (env.filesUsed >= env.fileBudget && req.action === "WRITE" && decision === "ALLOW") {
      decision = "REVIEW";
      decidedBy = { layer: "envelope", label: `Task Envelope — file budget (${env.fileBudget}) exhausted` };
      reasons.push(`Task Envelope: file-change budget (${env.fileBudget}) exhausted — re-authorization required.`);
    }
  }

  // 8. Default allow reason.
  if (decision === "ALLOW" && reasons.length === 0) {
    reasons.push(
      matched.length > 0
        ? "Permitted by enterprise policy; no safety invariant or limit triggered."
        : "No policy or safety invariant restricts this action; within normal working scope."
    );
  }
  if (decision === "CONSTRAIN" && transform) {
    safeAlternative = `Automatic ${transform.replaceAll("_", " ").toLowerCase()} lets the work continue safely without review.`;
  }
  if (decision === "REVIEW") {
    safeAlternative = suggestAlternative(req);
  }
  if (decision === "BLOCK" && !safeAlternative) {
    safeAlternative = suggestAlternative(req);
  }

  // 9. Break-glass override (scoped, loud).
  if (req.breakGlass && (decision === "REVIEW" || decision === "BLOCK") && safety.every((s) => s.ruleId !== "sk-cred-exfil")) {
    reasons.push("BREAK-GLASS override active: decision executed under emergency authority with high-visibility evidence and automatic expiry.");
    decision = "ALLOW";
    decidedBy = { layer: "breakglass", label: "Break-glass emergency override" };
  }

  return finish(req, {
    decision, reasons, matchedContracts: matched, safetyRules: safety, safetyObserved, decidedBy,
    transform, transformClasses, safeAlternative,
    risk: riskOf(req, decision, safety.length > 0),
  });
}

function suggestAlternative(req: ActionRequest): string {
  switch (req.action) {
    case "DELETE":
      return req.environment === "production"
        ? "Safer alternative: soft-delete with retention, or run against staging first."
        : "Safer alternative: move to trash / snapshot before delete.";
    case "WRITE":
      return "Safer alternative: push to a new feature branch and open a pull request.";
    case "DATA_EXPORT":
      return "Safer alternative: export an aggregated or row-limited sample (≤500 rows).";
    case "DEPLOY":
      return "Safer alternative: deploy to staging and request a scoped production window.";
    case "PERMISSION_CHANGE":
      return "Safer alternative: grant a narrowly scoped role with expiry instead of admin.";
    case "SECRET_ACCESS":
      return "Safer alternative: continue without the secret, or request a scoped exception.";
    default:
      return "Request a scoped, time-limited approval in Review Center.";
  }
}

function riskOf(req: ActionRequest, decision: Decision, safetyHit: boolean): "low" | "moderate" | "high" | "critical" {
  if (safetyHit) return "critical";
  if (decision === "BLOCK") return "high";
  if (decision === "REVIEW") return req.environment === "production" ? "high" : "moderate";
  if (decision === "CONSTRAIN") return "moderate";
  return "low";
}

function finish(_req: ActionRequest, r: BrainResult): BrainResult {
  return r;
}
