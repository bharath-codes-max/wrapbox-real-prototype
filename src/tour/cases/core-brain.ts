import type { TourCase } from "../types";

// Daniel opens Core Brain to see how every decision is made: the checks and their
// order, a real decision and the check that settled it, the detectors that spot
// sensitive data, and the capabilities Wrapbox openly admits it lacks.
const c: TourCase = {
  id: "core-brain",
  order: 115,
  persona: { userId: "u-daniel", name: "Daniel Kim", role: "Developer" },
  title: "How Wrapbox makes a decision",
  goal: "Daniel wants to see how Wrapbox decides what his coding agents may do.",
  outcome: "He knows the checks and their order, why his agent's test run was allowed, what catches a leaked password, and the gaps Wrapbox openly admits.",
  start: "control",
  poster: 3,
  steps: [
    {
      target: "button.topbar-search",
      action: "click",
      title: "Find the Core Brain",
      body: "Daniel wants to see how Wrapbox decides what his coding agents may do. Search lists every screen, including Core Brain.",
      waitFor: { selector: ".palette-item", text: "Core Brain" },
    },
    {
      target: { selector: ".palette-item", text: "Core Brain" },
      action: "click",
      title: "One engine for every decision",
      body: "Actions on laptops, in network traffic and on company systems all come to this one engine, and every decision comes with its reasons written down.",
      waitFor: ".page-head",
    },
    {
      // Clicking the tab also resets a tab remembered from an earlier visit.
      target: { selector: ".tab", text: "How it decides" },
      action: "click",
      title: "Nine checks, first objection wins",
      body: "Every action goes through the same nine checks in the same order. The first check that objects decides the outcome, and each count shows how often that happened.",
      waitFor: { selector: ".section-head", text: "How the brain decides" },
    },
    {
      target: { selector: ".card", text: "Latest action on your checkout code" },
      title: "Start with a real decision",
      body: "Minutes ago, Daniel's coding agent ran the checkout tests. ALLOW means it ran as asked: no check objected, so the last one, “Nothing objected”, let it through.",
    },
    {
      target: { selector: ".ecard", text: "Can we see inside?" },
      title: "Check one: can it see inside?",
      body: "If Wrapbox can't read what's being sent, like an encrypted zip, and a rule protects that kind of data, the action stops. That's what “fail closed” means.",
      placement: "bottom",
    },
    {
      target: { selector: ".ecard", text: "Your rules" },
      title: "Next, your company's own rules",
      body: "Rules your team wrote in plain words; if several match, the strictest wins. “Decided 10” means they made the call on 10 recorded actions.",
      placement: "bottom",
    },
    {
      target: { selector: ".ecard", text: "Safety Kernel" },
      title: "Then, rules nobody can switch off",
      body: "Built-in rules, like never sending passwords or keys outside the company. Your own rules can't turn them off.",
    },
    {
      target: { selector: ".tab", text: "Detectors" },
      action: "click",
      title: "Detectors spot sensitive data",
      body: "Each card is one detector and the kind of data it finds, like email addresses (PII.EMAIL). That's how the checks know what an agent is sending.",
      waitFor: { selector: ".section-head", text: "Detector Registry" },
    },
    {
      target: ".fsearch",
      action: "type",
      text: "password",
      title: "What catches a leaked password?",
      body: "Daniel searches for passwords. One detector covers API keys, private keys and passwords, and it's marked ENFORCED: working today, not planned.",
      waitFor: { selector: ".ecard", text: "secrets-v2" },
    },
    {
      target: { selector: ".tab", text: "Capability truthfulness" },
      action: "click",
      title: "No promise it can't keep",
      body: "Wrapbox lists what it can't fully do yet. UNINSPECTABLE means it can't read encrypted files, so check one can stop them, and rules relying on reading them can't be switched on.",
      waitFor: { selector: ".ecard", text: "Encrypted content" },
      placement: "left",
    },
  ],
};
export default c;
