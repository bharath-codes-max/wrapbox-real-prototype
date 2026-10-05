// What each of the Core Brain's checks found for one recorded action, read off the
// event's own facts. Three honest states: the check gave the answer, it had something
// to say but another check gave the answer, or it had nothing to object to.
import type { DecidedBy, SimulationEvent, StandingPermission } from "../model/types";
import { supplierById } from "../model/org";

export type CheckState = "decided" | "noted" | "clear";
export interface CheckFinding { layer: DecidedBy["layer"]; state: CheckState; note: string }

export const CHECK_ORDER: DecidedBy["layer"][] = [
  "killswitch", "uninspectable", "contract", "safety", "supplier", "blast", "context",
  "injection", "output", "envelope", "standing", "delegation", "breakglass", "default",
];

export function checkTrace(e: SimulationEvent, standing: StandingPermission[] = []): CheckFinding[] {
  const decidedLayer = e.decidedBy?.layer ?? "default";
  const card = standing.find((p) => p.agent === e.agent && p.resource === e.resource);
  const big = e.blastRadius && (e.blastRadius.severity === "high" || e.blastRadius.severity === "critical");
  // [has something to say, what it found]
  const facts: Record<DecidedBy["layer"], [boolean, string]> = {
    killswitch: [false, "This agent was not stopped"],
    uninspectable: e.inspection && !e.inspection.inspectable
      ? [true, `Could not read it: ${e.inspection.reason ?? "content not inspectable"}`]
      : [false, e.inspection ? "The content could be read" : "No content to read"],
    contract: e.matchedContracts.length
      ? [true, `${e.matchedContracts.length} of your rules matched: "${e.matchedContracts[0].clauseText}"`]
      : [false, "None of your rules matched"],
    safety: e.safetyRules.length
      ? [true, `Built-in rule: ${e.safetyRules.map((r) => r.name).join(", ")}`]
      : [false, "No built-in rule fired"],
    supplier: e.operator
      ? [true, `Supplier agent: ${supplierById(e.operator)?.name ?? e.operator}`]
      : [false, "Not a supplier's agent"],
    blast: e.blastRadius
      ? [!!big, `Size: ${e.blastRadius.label} (${e.blastRadius.severity})`]
      : [false, "Nothing large at stake"],
    context: e.context.privileged || e.context.environment === "production"
      ? [true, `${e.context.environment}${e.context.privileged ? ", privileged" : ""}`]
      : [false, `${e.context.environment}, not privileged`],
    injection: e.taint
      ? [true, `The agent had just read: ${e.taint.label}`]
      : [false, "The agent had not read outside content"],
    output: e.outputCheck
      ? [e.outputCheck.status !== "MATCH", e.outputCheck.status === "MATCH" ? "What the agent said matches the sealed result" : `What the agent said: ${e.outputCheck.status.toLowerCase()}`]
      : [false, "No claim to check"],
    envelope: e.taskId ? [true, "Inside a task, under its permission slip"] : [false, "Not inside a task"],
    standing: !e.taskId && card ? [true, `Has a card here: ${card.scope}`] : [false, e.taskId ? "Inside a task, so the card is not used" : "No card for this agent here"],
    delegation: e.delegation?.length ? [true, `Asked by another agent (${e.delegation.length} hop${e.delegation.length === 1 ? "" : "s"})`] : [false, "A person asked directly"],
    breakglass: e.breakGlass ? [true, "An emergency override was on for this system"] : [false, "No emergency override"],
    default: [false, decidedLayer === "default" ? "No check objected, so it was allowed" : "A check above gave the answer"],
  };
  return CHECK_ORDER.map((layer) => {
    const [has, note] = facts[layer];
    return { layer, state: layer === decidedLayer ? "decided" : has ? "noted" : "clear", note: layer === decidedLayer && e.decidedBy ? e.decidedBy.label : note };
  });
}
