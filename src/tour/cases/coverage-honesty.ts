import type { TourCase } from "../types";

// Priya checks which promises Wrapbox can really keep — and watches it refuse
// to switch on a rule it can't back up.
const c: TourCase = {
  id: "coverage-honesty",
  order: 100,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "See which promises really hold",
  goal: "Leadership asked Priya a hard question: of everything Wrapbox promises, what can it actually enforce today?",
  outcome: "She knows which promises are fully kept, which only partly, which gap to fix first — and that a rule Wrapbox can't back up stays switched off.",
  start: "control",
  poster: 9,
  steps: [
    {
      target: { selector: "button.topbar-search" },
      action: "click",
      title: "Open search",
      body: "Leadership wants to know what Wrapbox can truly protect today. Priya opens search, which jumps to any screen.",
      waitFor: ".palette",
    },
    {
      target: "input.palette-input",
      action: "type",
      text: "Coverage",
      title: "Find the Coverage Map",
      body: "The Coverage Map grades every promise Wrapbox makes by what it can actually deliver right now.",
      waitFor: { selector: ".palette-item", text: "Coverage Map" },
    },
    {
      target: { selector: ".palette-item", text: "Coverage Map" },
      action: "click",
      title: "Open the Coverage Map",
      body: "Priya opens it. Every grade on the Coverage Map is worked out live from the switched-on rules and Wrapbox's skills. Nobody types them in.",
      waitFor: { selector: ".card", text: "Coverage posture" },
    },
    {
      target: ".metricband",
      title: "One honest grade per promise",
      body: "Enforced: seen and stopped. Degraded: stopped, but not perfectly. Understood only: seen, not stopped. Pending: the skill isn't built. Uninspectable: content Wrapbox can't open.",
      pad: 10,
    },
    {
      target: { selector: "button.tab", text: "Known gaps" },
      action: "click",
      title: "Open the known gaps",
      body: "Every skill that isn't fully ready is listed openly, with the one holding back the most promises at the top.",
      waitFor: { selector: ".ecard", text: "Cloud (AWS) gateway" },
    },
    {
      target: { selector: ".ecard", text: "Cloud (AWS) gateway" },
      title: "The first thing to fix",
      body: "Wrapbox controls AWS permissions, file storage and container deployments, but other AWS services are only watched. This one gap weakens a company rule and two always-on safety rules.",
    },
    {
      target: { within: ".ecard", selector: "a", text: "1 rule" },
      action: "click",
      title: "A promise kept only in part",
      body: "One click shows the rule it weakens: production deployments need approval from the site reliability (SRE) team. Some AWS deployments can't be held for that approval yet, so it's graded degraded.",
      waitFor: { selector: ".ecard", text: "Production deployments require SRE approval" },
      placement: "bottom",
    },
    {
      target: { selector: "button.tab", text: "Not switched on" },
      action: "click",
      title: "A rule that can't go live",
      body: "A draft health-data rule has two parts. One would be enforced. The other needs a skill Wrapbox doesn't have — seeing inside encrypted files — so it would be pending.",
      waitFor: { selector: ".ecard-grid", text: "Uninspectable encrypted attachments" },
      placement: "top",
    },
    {
      target: { selector: ".rail-item", text: "Intent Studio" },
      action: "click",
      title: "Where rules are switched on",
      body: "Rules are written and switched on in Intent Studio. The health-data rule is still waiting there as a draft.",
      waitFor: { selector: ".ecard", text: "PHI handling (draft)" },
    },
    {
      target: { selector: ".ecard", text: "PHI handling (draft)" },
      action: "click",
      title: "Wrapbox refuses a false promise",
      body: "Priya opens the draft. Activate is greyed out, and Wrapbox says why: a required skill is missing, so it will not claim protection it cannot deliver.",
      waitFor: { within: ".drawer", selector: "div.small", text: "Can't be switched on" },
      pad: 40,
    },
  ],
};
export default c;
