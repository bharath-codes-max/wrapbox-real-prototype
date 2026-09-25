import type { TourCase } from "../types";

// Day one: Priya sets Wrapbox up for Veridian through the admin setup wizard,
// then returns to the Start page. Its hero is derived from what this workspace
// has connected: "No agents governed yet." on day one; after the laptop runtime
// for coding agents is connected it counts only the agents that runtime covers
// (Claude Code and Codex governed; the unregistered MCP agent inventory only).
const c: TourCase = {
  id: "setup-from-zero",
  order: 10,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Set up Wrapbox from zero",
  goal: "It's day one and nothing at Veridian is governed: Priya has to get Wrapbox running, from company sign-in to the first protected laptops.",
  outcome: "Veridian has its own workspace, 14 rules live and company laptops connected; the Start page now counts 2 of 3 agents governed.",
  workspace: "fresh",
  start: "onboarding/admin",
  poster: 9,
  steps: [
    {
      target: { selector: "button.choice", text: "Continue with Okta" },
      action: "click",
      title: "Day one: sign in with Okta",
      body: "Nothing at Veridian is governed yet. Priya, the admin, opens setup and signs in with Okta, the company login, so every agent action traces to a person.",
      waitFor: { selector: "div.row", text: "Signed in as" },
    },
    {
      target: { selector: ".step-footer .next", text: "Create workspace" },
      action: "click",
      title: "Create the workspace",
      body: "Wrapbox creates Veridian's workspace in the US region, with its own digital seal (a signing key) and a decision log that can't be quietly altered.",
      waitFor: "div:has(> .tick:nth-child(4) > .ok)",
    },
    {
      target: { selector: ".step-footer .next", text: "Continue" },
      action: "click",
      title: "Next: which agents to govern",
      body: "Wrapbox can scan GitHub to find agents already in use. It reads only their small settings files, never source code.",
      waitFor: { selector: "div:has(> div.row > button.btn-primary)", text: "Connect GitHub" },
    },
    {
      target: { selector: "button.choice", text: "Coding agents" },
      action: "click",
      title: "Start with coding agents",
      body: "Priya skips the scan and ticks coding agents, like Claude Code and Codex. They can read, change and run code on a laptop, so they come first.",
      waitFor: { selector: "button.choice.selected", text: "Coding agents" },
    },
    {
      target: { selector: ".step-footer .next", text: "Continue" },
      action: "click",
      title: "Next: the company's rules",
      body: "Wrapbox calls the company's rules an intent contract. Priya can start from a recommended set, or write each rule in plain English.",
      waitFor: { selector: "div.grid:has(> button.choice)", text: "Start from scratch" },
    },
    {
      target: { selector: "button.choice", text: "Start with recommended protections" },
      action: "click",
      title: "Check the recommended baseline",
      body: "Five ready-made rule sets, each labelled honestly: ENFORCED means Wrapbox can fully apply it, DEGRADED only partly, PENDING not yet.",
      waitFor: { selector: "div:has(> div.row > span.chip)", text: "rules" },
    },
    {
      target: { selector: "button", text: "Publish contract" },
      action: "click",
      title: "Publish: 14 rules go live",
      body: "Four sets switch on at once: the top bar now reads Enforcing 14 rules. The health-data set stays a draft because Wrapbox can't look inside encrypted files.",
      waitFor: { selector: "div:has(> div.row > span.row)", text: "kept as draft" },
    },
    {
      target: { selector: ".step-footer .next", text: "Continue" },
      action: "click",
      title: "Next: connect where agents work",
      body: "Rules only count where Wrapbox can see agents act. First up: company laptops, marked ENFORCED, so Wrapbox can stop an action there, not just watch it.",
      waitFor: { selector: ".card .card", text: "macOS Endpoint runtime" },
    },
    {
      target: { selector: "button", text: "Connect", exact: true },
      action: "click",
      title: "Connect the company laptops",
      body: "IT pushes Wrapbox to company Macs through device management (simulated here). Once they check in, coding agents' file and command actions are checked before they run.",
      waitFor: { selector: ".card .card", text: "Connected · Endpoint" },
    },
    {
      route: "start",
      target: ".govbanner",
      title: "2 of 3 agents now governed",
      body: "Earlier, this page said “No agents governed yet.” Now Wrapbox checks Claude Code and Codex before they act. One unregistered agent is only listed, not yet covered.",
    },
  ],
};
export default c;
