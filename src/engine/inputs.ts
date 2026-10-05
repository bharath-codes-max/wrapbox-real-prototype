// The 15 facts the Core Brain weighs for one action, read straight off the
// recorded event. Nothing here is typed in: an input the event does not carry
// is reported as absent, with a plain sentence saying so.
import type { DecidedBy, SimulationEvent, StandingPermission } from "../model/types";
import { agentById, deviceById, resourceById, supplierById, userById } from "../model/org";
import { destById, mcpServerById, planeLabel } from "../model/registries";

export type InputGroup = "who" | "what" | "situation" | "authority";
export const INPUT_GROUPS: { id: InputGroup; title: string }[] = [
  { id: "who", title: "Who is acting" },
  { id: "what", title: "What it is doing" },
  { id: "situation", title: "The situation" },
  { id: "authority", title: "What authority applies" },
];

export interface DecisionInput {
  key: string;
  label: string;
  group: InputGroup;
  /** False when this action simply has none (no delegation, no MCP call, …). */
  present: boolean;
  /** The headline value. */
  value: string;
  /** Supporting facts, one per line. */
  detail: string[];
  /** Shown in monospace (a command, a tool call). */
  code?: string;
  /** This input is the one the deciding gate read. */
  decided: boolean;
}

/** Which input a deciding gate reads. Gates with no single input (break-glass, the
 *  output check, "nothing objected") highlight none. */
const INPUT_OF_LAYER: Partial<Record<DecidedBy["layer"], string>> = {
  killswitch: "agent", uninspectable: "data", contract: "contract", safety: "safety", supplier: "supplier",
  blast: "context", context: "context", injection: "untrusted", envelope: "authority", standing: "authority",
  delegation: "delegation",
};

const n = (x: number) => x.toLocaleString("en-US");

export function decisionInputs(e: SimulationEvent, standing: StandingPermission[] = []): DecisionInput[] {
  const user = userById(e.user);
  const device = deviceById(e.device);
  const agent = agentById(e.agent);
  const res = resourceById(e.resource);
  const dest = e.destination ? destById(e.destination) : undefined;
  const supplier = supplierById(e.operator);
  const findings = e.inspection?.findings ?? [];
  const card = standing.find((p) => p.agent === e.agent && p.resource === e.resource);
  const hot = e.decidedBy ? INPUT_OF_LAYER[e.decidedBy.layer] : undefined;

  const rows: Omit<DecisionInput, "decided">[] = [
    { key: "who", label: "Who", group: "who", present: true, value: user?.name ?? e.user, detail: user ? [user.role] : [] },
    { key: "device", label: "Device", group: "who", present: true, value: device?.name ?? e.device,
      detail: device ? [`${device.os}${"enrolled" in device ? (device.enrolled ? " · enrolled" : " · not enrolled") : ""}`, `caught at: ${planeLabel(e.plane)}`] : [`caught at: ${planeLabel(e.plane)}`] },
    { key: "agent", label: "Agent", group: "who", present: true, value: agent?.name ?? e.agent,
      detail: agent ? [`${agent.provider} · trust: ${agent.trust} · risk: ${agent.risk}`, ...(agent.discovered ? ["discovered, not registered"] : [])] : [] },
    e.delegation?.length
      ? { key: "delegation", label: "Delegation chain", group: "who", present: true,
          value: [...e.delegation.map((h) => agentById(h.agent)?.name ?? h.agent), agent?.name ?? e.agent].join(" → "),
          detail: e.delegation.map((h) => `${agentById(h.agent)?.name ?? h.agent} asked: ${h.asked}`) }
      : { key: "delegation", label: "Delegation chain", group: "who", present: false, value: "None", detail: [`${user?.name ?? "The person"} asked the agent directly`] },

    { key: "action", label: "Action", group: "what", present: true, value: e.action, detail: [], ...(e.actionRaw ? { code: e.actionRaw } : {}) },
    e.mcp
      ? { key: "mcp", label: "MCP tool + arguments", group: "what", present: true,
          value: `${mcpServerById(e.mcp.server)?.label ?? e.mcp.server} · ${e.mcp.tool}`,
          detail: [`${e.mcp.registered ? "registered server" : "unregistered server"} · ${e.mcp.transport}`],
          code: Object.entries(e.mcp.args).map(([k, v]) => `${k}: ${v}`).join("\n") }
      : { key: "mcp", label: "MCP tool + arguments", group: "what", present: false, value: "None", detail: ["Not an MCP tool call"] },
    { key: "resource", label: "Resource", group: "what", present: true, value: res?.name ?? e.resource,
      detail: res ? [`${res.kind} · ${res.environment} · ${res.sensitivity}`, res.detail] : [] },
    e.inspection && !e.inspection.inspectable
      ? { key: "data", label: "Data", group: "what", present: true, value: "Could not be read", detail: [e.inspection.reason ?? "content is not inspectable"] }
      : findings.length
        ? { key: "data", label: "Data", group: "what", present: true,
            value: findings.map((f) => f.dataClass).join(", "),
            detail: findings.map((f) => `${f.dataClass} × ${n(f.count)} · found by ${f.detector} · ${(f.confidence * 100).toFixed(0)}% sure`) }
        : e.dataClasses.length
          ? { key: "data", label: "Data", group: "what", present: true, value: e.dataClasses.join(", "), detail: [] }
          : { key: "data", label: "Data", group: "what", present: false, value: "None found", detail: ["No sensitive data in this action"] },
    e.destination || e.destinationClass
      ? { key: "destination", label: "Destination", group: "what", present: true, value: dest?.label ?? e.destination ?? String(e.destinationClass),
          detail: [...(dest ? [dest.host] : []), ...(e.destinationClass ? [`class: ${e.destinationClass}`] : [])] }
      : { key: "destination", label: "Destination", group: "what", present: false, value: "None", detail: ["Nothing leaves the company in this action"] },

    { key: "context", label: "Context", group: "situation", present: true, value: e.context.environment,
      detail: [
        `sensitivity: ${e.context.resourceSensitivity}`,
        `${e.context.privileged ? "privileged action" : "not privileged"} · ${e.context.businessHours ? "business hours" : "outside business hours"}`,
        ...(e.blastRadius ? [`size: ${e.blastRadius.label} (${e.blastRadius.severity})`] : []),
      ] },
    e.taint
      ? { key: "untrusted", label: "Recent untrusted input", group: "situation", present: true, value: e.taint.label,
          detail: [`read ${Math.max(0, Math.round((e.timestamp - e.taint.at) / 60000))} min before this action`] }
      : e.untrustedRead
        ? { key: "untrusted", label: "Recent untrusted input", group: "situation", present: true, value: e.untrustedRead.label, detail: ["This action itself reads it, so the agent's next risky step is watched"] }
        : { key: "untrusted", label: "Recent untrusted input", group: "situation", present: false, value: "None", detail: ["The agent had not read outside content"] },

    e.matchedContracts.length
      ? { key: "contract", label: "Intent contract", group: "authority", present: true,
          value: `${e.matchedContracts.length} rule${e.matchedContracts.length === 1 ? "" : "s"} matched`,
          detail: e.matchedContracts.map((m) => `${m.effect ? `${m.effect} · ` : ""}"${m.clauseText}" (${m.contractName})`) }
      : { key: "contract", label: "Intent contract", group: "authority", present: false, value: "No rule matched", detail: ["None of your rules covers this action"] },
    e.safetyRules.length
      ? { key: "safety", label: "Safety Kernel", group: "authority", present: true,
          value: e.safetyRules.map((r) => r.name).join(", "), detail: e.safetyRules.map((r) => r.description) }
      : { key: "safety", label: "Safety Kernel", group: "authority", present: false, value: "No built-in rule fired",
          detail: e.safetyObserved?.length ? [`watching only: ${e.safetyObserved.map((r) => r.name).join(", ")}`] : [] },
    supplier
      ? { key: "supplier", label: "Supplier contract", group: "authority", present: true, value: supplier.name,
          detail: [`${supplier.service} · contract ends ${supplier.contractEnds}`, `may: ${supplier.scopeActions.join(", ")} on ${supplier.scopeResources.map((r) => resourceById(r)?.name ?? r).join(", ")}`] }
      : { key: "supplier", label: "Supplier contract", group: "authority", present: false, value: "None", detail: ["The company's own agent, not a supplier's"] },
    e.taskId
      ? { key: "authority", label: "Task / standing authority", group: "authority", present: true,
          value: `Inside a task${e.stepIndex !== undefined ? ` · step ${e.stepIndex + 1}` : ""}`, detail: ["The task's permission slip is the authority here"] }
      : card
        ? { key: "authority", label: "Task / standing authority", group: "authority", present: true, value: `Standing permission: ${card.scope}`,
            detail: [`may: ${card.allowed.join(", ")}`, ...(card.maxRows !== undefined ? [`at most ${n(card.maxRows)} rows per query`] : []), ...(card.forbidden.length ? [`may not: ${card.forbidden.join(", ")}`] : []), `status now: ${card.status}`] }
        : { key: "authority", label: "Task / standing authority", group: "authority", present: false, value: "None", detail: ["Not inside a task, and no standing permission for this agent on this system"] },
  ];
  return rows.map((r) => ({ ...r, decided: r.key === hot }));
}

/** How many recorded actions carry each input — the denominator is every event. */
export function inputPresence(events: SimulationEvent[], standing: StandingPermission[] = []): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) for (const r of decisionInputs(e, standing)) if (r.present) out[r.key] = (out[r.key] ?? 0) + 1;
  return out;
}
