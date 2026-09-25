import type { TourCase } from "../types";

// Maya accepts a Policy Autopilot suggestion: Wrapbox noticed a pattern in what
// coding agents do and proposed a rule. Accepting creates a switched-off DRAFT
// rule (never an active one), which then appears alongside the company's rules,
// ready to try in the Policy Simulator before anyone presses Activate.
// Note: the prototype records every new rule under its admin (store.ts
// acceptAutopilot → author "u-priya"), so the card names Priya; step 7 says so.
const c: TourCase = {
  id: "autopilot-accept",
  order: 35,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "Accept an Autopilot suggestion",
  goal: "Maya wants to turn what Wrapbox has already seen coding agents do into a rule, without writing one from scratch.",
  outcome: "One click turned an evidence-backed suggestion into a draft rule Maya can test, still switched off until someone activates it.",
  start: "intent",
  poster: 5,
  steps: [
    {
      target: { selector: "[role=tab]", text: "Policy Autopilot" },
      action: "click",
      title: "Open Policy Autopilot",
      body: "Maya is in Intent Studio, where the company's rules live, and opens Policy Autopilot: rules Wrapbox suggests from what agents actually did.",
      waitFor: { selector: ".ecard", text: "force pushes to main" },
    },
    {
      target: { selector: ".ecard-head", text: "force pushes to main" },
      title: "What Wrapbox noticed",
      body: "Over 30 days, 93% of coding-agent pushes went to side branches. Every forced push to main, which can overwrite the team's shared code, was reviewed or refused.",
    },
    {
      target: { selector: "dd", text: "412 events" },
      title: "How much it is based on",
      body: "Each suggestion shows how much activity stands behind it (here, 412 observed events) so Maya can judge how solid it is.",
    },
    {
      target: { selector: "dd", text: "Require engineering review for any push to main" },
      title: "What Wrapbox suggests",
      body: "The suggested rule: whenever a coding agent pushes to main, an engineer must review it first.",
    },
    {
      target: { selector: "dd", text: "switched off until you activate it" },
      title: "What accepting will do",
      body: "Accepting doesn't switch anything on. It only creates a draft rule, which stays off until a person activates it.",
    },
    {
      target: { within: ".ecard", selector: "button", text: "Accept", exact: true },
      action: "click",
      title: "Accept the suggestion",
      body: "Maya accepts. Wrapbox lists exactly what it created: a draft rule to test in the Policy Simulator before anyone switches it on.",
      waitFor: { selector: ".card", text: "Handled" },
    },
    {
      target: { selector: "[role=tab]", text: "Intent contracts" },
      action: "click",
      title: "Find it with the other rules",
      body: "Back on the rules list, the count went from 5 to 6. The card names Priya only because this demo files new rules under the admin's name.",
      waitFor: { selector: ".ecard", text: "Autopilot · Protect main branch" },
    },
    {
      target: { selector: ".ecard", text: "Autopilot · Protect main branch" },
      title: "A draft, not yet live",
      body: "DRAFT means switched off, so no agent is affected yet. ENFORCED means Wrapbox's GitHub connection can already check these pushes, so it would work the moment it's on.",
    },
    {
      target: { selector: ".ecard", text: "Autopilot · Protect main branch" },
      action: "click",
      title: "What the rule would do",
      body: "Maya opens the draft. Source-code changes in production, like a push to main, wait for a person's OK (REVIEW). 'Fail closed': a push Wrapbox can't read is blocked.",
      waitFor: { within: ".drawer", selector: ".card", text: "Only in" },
    },
    {
      target: { within: ".drawer", selector: ".row", text: "Simulate impact" },
      title: "Ready to test, still switched off",
      body: "Simulate impact lets Maya replay past agent actions with this rule on, before anything changes. Activate switches it on for real. Autopilot did neither by itself.",
    },
  ],
};
export default c;
