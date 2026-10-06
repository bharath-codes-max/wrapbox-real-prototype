// Deck v2's walkthroughs: the same journeys as src/tour/cases, written for the live
// prototype's shell (tour-v2.html) — its own sidebar, tab names, three places and
// Core Brain — and kept separate so the original set (deck v3, the demo, the video)
// is never touched. One file per case; pure data, so the deck can list them without
// loading the product.
import type { TourCase } from "../../types";

const mods = import.meta.glob<{ default: TourCase }>("./*.ts", { eager: true });

const ALL: TourCase[] = Object.entries(mods)
  .filter(([p]) => !p.endsWith("/index.ts"))
  .map(([, m]) => m.default)
  .filter((c): c is TourCase => !!c && typeof c.id === "string" && Array.isArray(c.steps) && c.steps.length > 0)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export const CASES: TourCase[] = ALL.filter((c) => c.order < 900);

export function caseById(id: string): TourCase | undefined {
  return ALL.find((c) => c.id === id);
}
