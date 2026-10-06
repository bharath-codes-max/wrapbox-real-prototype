// Deck v2's walkthrough page (tour-v2.html): the same player as tour.html, but the app
// runs in the live prototype's shell — the Dovetail design system, three places, the
// new Core Brain — with deck v2's own walkthroughs and narration. tour.html itself is
// untouched, so v3, the demo and the video keep the original look.
import "../styles/desktop.css";
import VOICE from "./v2/voice.json";
import { CASES, caseById } from "./v2/cases";
import { startTour } from "./start";

startTour({
  cases: CASES,
  caseById,
  clips: (VOICE as { cases: Record<string, { file: string; ms: number }[]> }).cases,
  voiceBase: import.meta.env.DEV ? "/docs/voice-v2/" : "voice-v2/",
});
