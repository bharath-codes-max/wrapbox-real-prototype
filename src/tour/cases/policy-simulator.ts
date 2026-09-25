import type { TourCase } from "../types";

// Maya tests a rule change against the company's real history before anyone
// makes it: she switches one rule off in the Policy Simulator (a preview only),
// replays recorded actions and the scenario library through the live decision
// engine, sees the one action that would lose its protection, and confirms the
// live rule was never touched.
const c: TourCase = {
  id: "policy-simulator",
  order: 40,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "Test a rule change safely",
  goal: "Engineers have asked to drop the review step when code goes outside approved AI tools, and Maya wants to know what that would really change first.",
  outcome: "She saw, from the company's own history, the one action that would lose its protection — and the live rules never changed while she tested.",
  start: "control",
  poster: 4,
  steps: [
    {
      target: { selector: ".rail-item", text: "Policy Simulator" },
      action: "click",
      title: "Open the Policy Simulator",
      body: "A safe place to try a rule change against what really happened. Nothing Maya does here changes the live rules.",
      waitFor: { selector: ".page-head", text: "Policy Simulator" },
    },
    {
      target: { selector: ".ecard", text: "External AI usage" },
      title: "Today's rules, one tick each",
      body: "Each card is a company policy (a \"contract\"); a tick means the rule is on. Tags: ALLOW, CONSTRAIN (sensitive parts masked), REVIEW (a person approves) or BLOCK.",
    },
    {
      target: { selector: "label.rule-item", text: "Source code may go to approved AI" },
      action: "click",
      title: "Switch one rule off, in preview",
      body: "This rule lets code go to approved AI tools, but a person must review it before it goes anywhere else. Maya unticks it, only inside this preview.",
      waitFor: { selector: ".ecard", text: "3 of 4 on in preview" },
    },
    {
      target: { selector: "[role=tab]", text: "See what would happen" },
      action: "click",
      title: "Replay the company's real history",
      body: "Wrapbox runs the company's 20 recorded actions through its live decision engine twice: once under today's rules, once with Maya's change.",
      waitFor: { selector: ".card", text: "Impact preview" },
    },
    {
      target: { selector: ".card .grid.g2 > div", text: "With your proposal" },
      placement: "bottom",
      title: "One past action would change",
      body: "Left is today; right is with the change. One action moves from REVIEW, where a person approves it, to ALLOW, where it goes straight through.",
    },
    {
      target: { selector: ".card", text: "Heads up" },
      title: "A red flag for weaker protection",
      body: "Wrapbox warns that something protected today would simply be allowed. The Safety Kernel, built-in rules that can't be switched off, would still apply.",
    },
    {
      target: { selector: ".ecard", text: "Sent checkout.ts to FreeAIChat" },
      title: "The exact action at stake",
      body: "Daniel pasted proprietary checkout code into FreeAIChat, an AI tool the company hasn't approved. Today a person must approve that first; with the change it would go straight out.",
    },
    {
      target: { selector: "button.tab", text: "Scenario library" },
      action: "click",
      title: "Test beyond this company's history",
      body: "Maya also replays 23 standard situations, including ones this company hasn't met yet. Again, just one outcome changes, from REVIEW to ALLOW.",
      waitFor: { selector: ".card", text: "1 of 23 outcomes change" },
    },
    {
      target: { selector: "[role=tab]", text: "Make it real" },
      action: "click",
      title: "A preview, never the real thing",
      body: "This page never changes what Wrapbox enforces. Rules are really switched on or off in Intent Studio.",
      waitFor: { selector: ".card", text: "Open Intent Studio" },
    },
    {
      target: { selector: "button", text: "Open Intent Studio" },
      action: "click",
      title: "The live rule is untouched",
      body: "Maya checks Intent Studio, where the live rules are kept. External AI usage is still ACTIVE with all 4 of its rules (clauses): nothing changed while she tested.",
      waitFor: { selector: ".ecard", text: "External AI usage" },
    },
  ],
};
export default c;
