import type { SlideDef } from "../deck";
import { Cover, Problem, Quantified, Gap, Journey } from "./s01-05";
import { Personas, Solution, Intent, DecisionLive, Screens } from "./s06-10";
import { Honest, Different, Business, Built, Next } from "./s11-15";

// Fifteen slides, one story: problem → research → concept → product → how it's
// built → business → what's next. Every number on the product slides is computed
// from the codebase; every external figure cites a verified source.
export const SLIDES: SlideDef[] = [
  { id: "cover", section: "Product portfolio", title: "Wrapbox", tone: "ink", Component: Cover },
  { id: "problem", section: "01 · Problem", title: "Agents act", tone: "rose", Component: Problem },
  { id: "quantified", section: "01 · Problem", title: "By the numbers", tone: "sand", Component: Quantified },
  { id: "gap", section: "02 · Research", title: "The gap", tone: "sky", Component: Gap },
  { id: "journey", section: "03 · Concept", title: "How I got here", tone: "paper", Component: Journey },
  { id: "personas", section: "03 · Concept", title: "Who it's for", tone: "lavender", Component: Personas },
  { id: "solution", section: "04 · Product", title: "End to end", tone: "mint", Component: Solution },
  { id: "intent", section: "04 · Product", title: "Plain English → policy", tone: "sky", Component: Intent },
  { id: "decision", section: "04 · Product", title: "The decision, live", tone: "ink", Component: DecisionLive },
  { id: "screens", section: "04 · Product", title: "Twenty screens", tone: "paper", Component: Screens },
  { id: "honest", section: "04 · Product", title: "Honest by design", tone: "sand", Component: Honest },
  { id: "different", section: "05 · Market", title: "Why it's different", tone: "rose", Component: Different },
  { id: "business", section: "05 · Business & GTM", title: "Business model", tone: "mint", Component: Business },
  { id: "built", section: "06 · Under the hood", title: "How it's built", tone: "paper", Component: Built },
  { id: "next", section: "07 · Next", title: "To production", tone: "ink", Component: Next },
];
