import type { Scenario } from "../engine/scenarios";
import type { Decision, SimulationEvent } from "../model/types";

export interface PolicyCell {
  event: SimulationEvent;
  /** The scenario was written for this agent; other cells are the same request made by another agent. */
  authored: boolean;
}

export interface PolicyMap {
  cols: Scenario[];
  groups: { group: Scenario["group"]; start: number; span: number }[];
  rows: { agent: string; cells: PolicyCell[] }[];
  totals: Record<Decision, number>;
}

/** Every authored scenario, re-issued by every agent and evaluated by `evaluate`
 *  (the store's side-effect-free shadowEvent in the app): what each agent would get
 *  right now. Columns keep the Simulation Lab's scenario order, grouped by plane. */
export function buildPolicyMap(
  scenarios: Scenario[],
  agentIds: string[],
  evaluate: (sc: Scenario) => SimulationEvent,
): PolicyMap {
  const cols = scenarios.filter((sc) => sc.group !== "TASK");
  const groups: PolicyMap["groups"] = [];
  cols.forEach((sc, i) => {
    const last = groups[groups.length - 1];
    if (last && last.group === sc.group) last.span++;
    else groups.push({ group: sc.group, start: i, span: 1 });
  });
  const totals: Record<Decision, number> = { ALLOW: 0, CONSTRAIN: 0, REVIEW: 0, BLOCK: 0 };
  const rows = agentIds.map((agent) => ({
    agent,
    cells: cols.map((sc) => {
      const event = evaluate(sc.agent === agent ? sc : { ...sc, agent });
      totals[event.decision]++;
      return { event, authored: sc.agent === agent };
    }),
  }));
  return { cols, groups, rows, totals };
}
