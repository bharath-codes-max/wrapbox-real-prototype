import type { TourCase } from "../types";

// Priya checks which promises Wrapbox can really keep — and watches it refuse
// to switch on a rule it can't back up.
const c: TourCase = {
  id: "coverage-honesty",
  order: 100,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "See which promises really hold",
  goal: "Leadership asked Priya a hard question: of everything Wrapbox promises, what can it actually enforce today?",
  outcome: "Priya knows which promises are fully kept, which only in part, which gap to fix first — and that Wrapbox won't switch on a rule it can't back up.",
  start: "control",
  poster: 9,
  steps: [
    {
      target: { selector: "button.topbar-search" },
      action: "click",
      title: "Open search",
      body: "Leadership asked what Wrapbox can truly enforce today. Priya opens search, which jumps to any screen.",
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
      body: "Priya opens it. Every grade is worked out live from the switched-on rules and Wrapbox's skills. Nobody types them in.",
      waitFor: { selector: ".card", text: "Coverage posture" },
    },
    {
      target: ".metricband",
      title: "One honest grade per promise",
      body: "Enforced: seen and stopped. Degraded: stopped, not perfectly. Understood only: seen, not stopped yet. Pending: skill not built. Uninspectable: locked content Wrapbox can't open.",
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
      body: "Wrapbox controls AWS permissions, file storage and container deploys, but other AWS services are only watched. This gap weakens one company rule and two always-on safety rules.",
    },
    {
      target: { within: ".ecard", selector: "a", text: "1 rule" },
      action: "click",
      title: "A promise kept only in part",
      body: "One click shows the rule: production deploys need approval from the site reliability (SRE) team. Some AWS deploys can't be held for approval yet, so it's Degraded.",
      waitFor: { selector: ".ecard", text: "Production deployments require SRE approval" },
      placement: "bottom",
    },
    {
      target: { selector: ".rail-item", text: "Intent Studio" },
      action: "click",
      title: "Where rules are switched on",
      body: "Rules are written and switched on in Intent Studio. Earlier, Maya Chen from security drafted a health-data rule there. It is still a draft.",
      waitFor: { selector: ".ecard", text: "PHI handling (draft)" },
    },
    {
      target: { selector: ".ecard", text: "PHI handling (draft)" },
      action: "click",
      title: "One part needs a missing skill",
      body: "Priya opens the draft. Removing health data from scanned files would be fully enforced. Blocking encrypted attachments needs a skill Wrapbox lacks: seeing inside encrypted files.",
      waitFor: { within: ".drawer", selector: ".card", text: "Uninspectable encrypted attachments" },
    },
    {
      target: { within: ".drawer", selector: "button", text: "Activate", exact: true },
      action: "click",
      title: "Wrapbox refuses a false promise",
      body: "Priya tries Activate, but it stays greyed out. A required skill is missing, so Wrapbox won't switch on protection it can't deliver.",
      waitFor: { within: ".drawer", selector: "div.small", text: "Can't be switched on" },
      placement: "left",
    },
  ],
};
export default c;
