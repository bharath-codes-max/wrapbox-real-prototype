// Walkthrough entry (tour.html): the original shell, with the original walkthroughs. The
// deck v3, the demo and the video load this page.
//   tour.html?case=<id>            play the case at presentation pace
//   tour.html?case=<id>&from=N     fast-forward to step N, then play
//   tour.html?case=<id>&check=1    run every step instantly, print JSON results
//   tour.html?case=<id>&shot=N     freeze on step N's spotlight (add &after=1 to show its result)
//   &speed=0.5                     play twice as fast (authoring)
import type { TourCase } from "./types";
import { CASES, caseById } from "./cases";
import { startTour } from "./start";

// Cases being written live in cases/drafts load on demand, so a draft with a
// mistake only breaks itself — never the finished cases or the deck.
const drafts = import.meta.glob<{ default: TourCase }>("./cases/drafts/*.ts");
startTour({
  cases: CASES,
  caseById,
  loadDraft: async (id) => { const k = `./cases/drafts/${id}.ts`; return drafts[k] ? (await drafts[k]()).default ?? null : null; },
});
