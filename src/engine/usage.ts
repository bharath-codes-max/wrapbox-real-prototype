import type { Decision, SimulationEvent } from "../model/types";

export interface DetectorUse {
  /** Recorded actions this detector found something in. */
  actions: number;
  /** Individual items found across those actions (one email = one item). */
  items: number;
  /** Who was using the agent, most actions first. */
  users: { id: string; actions: number }[];
  byDecision: Partial<Record<Decision, number>>;
  latest: SimulationEvent | null;
}

/** How each detector has really been used, counted from the recorded events'
 *  own findings — nothing estimated. A detector absent from the map never fired. */
export function detectorUsage(events: SimulationEvent[]): Map<string, DetectorUse> {
  const out = new Map<string, DetectorUse>();
  const perUser = new Map<string, Map<string, number>>();
  for (const e of events) {
    const seen = new Set<string>();
    for (const f of e.inspection?.findings ?? []) {
      const u = out.get(f.detector) ?? { actions: 0, items: 0, users: [], byDecision: {}, latest: null };
      u.items += f.count;
      if (!seen.has(f.detector)) {
        seen.add(f.detector);
        u.actions++;
        u.byDecision[e.decision] = (u.byDecision[e.decision] ?? 0) + 1;
        if (!u.latest || e.timestamp > u.latest.timestamp) u.latest = e;
        const m = perUser.get(f.detector) ?? new Map<string, number>();
        m.set(e.user, (m.get(e.user) ?? 0) + 1);
        perUser.set(f.detector, m);
      }
      out.set(f.detector, u);
    }
  }
  for (const [id, u] of out) {
    u.users = [...(perUser.get(id) ?? [])].map(([uid, actions]) => ({ id: uid, actions })).sort((a, b) => b.actions - a.actions);
  }
  return out;
}
