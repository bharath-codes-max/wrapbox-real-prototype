import type { SlideDef } from "../deck";
import { Cover, Understand, Numbers, Gap } from "./s01-05";
import { Market, Landscape, Synthesize, Ideate } from "./s06-10";
import { Architecture, IntentLive, DecisionLive, Tested, Close } from "./s11-15";

export type Phase = "portfolio" | "understand" | "research" | "synthesize" | "ideate" | "prototype" | "test";
export const PHASES: { key: Phase; label: string }[] = [
  { key: "understand", label: "Understand" },
  { key: "research", label: "Research" },
  { key: "synthesize", label: "Synthesize" },
  { key: "ideate", label: "Ideate" },
  { key: "prototype", label: "Prototype" },
  { key: "test", label: "Test" },
];

// The design-process spine. Product-slide numbers are computed from the codebase;
// every external figure cites a source-verified claim (data/research.json).
export const SLIDES: SlideDef[] = [
  { id: "cover", phase: "understand", title: "Wrapbox", Component: Cover },
  { id: "understand", phase: "understand", title: "Agents act", Component: Understand },
  { id: "numbers", phase: "research", title: "By the numbers", Component: Numbers },
  { id: "gap", phase: "research", title: "The gap", Component: Gap },
  { id: "market", phase: "research", title: "Market value", Component: Market },
  { id: "landscape", phase: "research", title: "Landscape", Component: Landscape },
  { id: "synthesize", phase: "synthesize", title: "Insights", Component: Synthesize },
  { id: "ideate", phase: "ideate", title: "Insight → design", Component: Ideate },
  { id: "architecture", phase: "prototype", title: "Architecture", Component: Architecture },
  { id: "intent", phase: "prototype", title: "Intent Studio, live", Component: IntentLive },
  { id: "decision", phase: "prototype", title: "The decision, live", Component: DecisionLive },
  { id: "tested", phase: "test", title: "Tested, not claimed", Component: Tested },
  { id: "close", phase: "test", title: "To production", Component: Close },
];
