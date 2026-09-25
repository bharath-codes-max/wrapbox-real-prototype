// Every walkthrough in this folder, one file per case, ordered for the deck.
// Case files are pure data (no app imports), so the deck can list them without
// loading the product.
import type { TourCase } from "../types";

const mods = import.meta.glob<{ default: TourCase }>("./*.ts", { eager: true });

export const CASES: TourCase[] = Object.entries(mods)
  .filter(([p]) => !p.endsWith("/index.ts"))
  .map(([, m]) => m.default)
  .filter((c): c is TourCase => !!c && typeof c.id === "string" && Array.isArray(c.steps) && c.steps.length > 0)
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function caseById(id: string): TourCase | undefined {
  return CASES.find((c) => c.id === id);
}
