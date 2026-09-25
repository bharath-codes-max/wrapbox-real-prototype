import type { TourCase } from "../types";

// Day one: Priya sets Wrapbox up for Veridian through the admin setup wizard.
// Starts inside the wizard: on a fresh workspace the Start page hero still shows
// governed-agent counts from the static fleet, which would contradict "day one".
const c: TourCase = {
  id: "setup-from-zero",
  order: 10,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Set up Wrapbox from zero",
  goal: "It's day one: Priya has to get Wrapbox running for Veridian, from company sign-in to the first rules switched on.",
  outcome: "Veridian has its own workspace, four of five recommended rule sets live and company laptops connected; approvers, invites and a go-live test come next.",
  workspace: "fresh",
  start: "onboarding/admin",
  poster: 7,
  steps: [
    {
      target: ".setup-steps",
      title: "Day one: a seven-step setup",
      body: "It's Veridian's first day with Wrapbox: no rules, no connections, no decisions yet. Priya, the admin, follows the guided setup.",
    },
    {
      target: { selector: "button.choice", text: "Continue with Okta" },
      action: "click",
      title: "Sign in with the company login",
      body: "Priya signs in with Okta, the company login (simulated in this demo), so every agent action traces back to a real person.",
      waitFor: { selector: "div.row", text: "Signed in as" },
    },
    {
      target: { selector: ".step-footer .next", text: "Create workspace" },
      action: "click",
      title: "Create the workspace",
      body: "Wrapbox creates the workspace in the US region, with its own digital seal (a signing key) and a tamper-evident log that records every future decision.",
      waitFor: "div:has(> .tick:nth-child(4) > .ok)",
    },
    {
      target: { selector: ".step-footer .next", text: "Continue" },
      action: "click",
      title: "Next: which agents to govern",
      body: "Wrapbox can scan GitHub for agents already in use, reading only their small settings files, never source code. Or Priya simply ticks the kinds she wants covered.",
      waitFor: { selector: "div:has(> div.row > button.btn-primary)", text: "Connect GitHub" },
    },
    {
      target: { selector: "button.choice", text: "Coding agents" },
      action: "click",
      title: "Start with coding agents",
      body: "Coding agents like Claude Code and Codex can read, change and run code on a laptop, so Priya puts them under Wrapbox first.",
      waitFor: { selector: "button.choice.selected", text: "Coding agents" },
    },
    {
      target: { selector: ".step-footer .next", text: "Continue" },
      action: "click",
      title: "Next: the company's rules",
      body: "Wrapbox calls a set of company rules an intent contract. Priya can start from recommended ones, or write each rule herself in plain English.",
      waitFor: { selector: "div.grid:has(> button.choice)", text: "Start from scratch" },
    },
    {
      target: { selector: "button.choice", text: "Start with recommended protections" },
      action: "click",
      title: "Check the recommended baseline",
      body: "Five ready-made rule sets, from AI use to health records. Each is labelled honestly: ENFORCED is fully checked, DEGRADED has some gaps, PENDING can't be checked yet.",
      waitFor: { selector: "div:has(> div.row > span.chip)", text: "rules" },
    },
    {
      target: { selector: "button", text: "Publish contract" },
      action: "click",
      title: "Publish: 14 rules go live",
      body: "Publishing switches four sets on at once; the header goes from Enforcing 0 to 14 rules. The health-data set stays a draft: it needs to inspect encrypted files, which Wrapbox can't do yet.",
      waitFor: { selector: "div:has(> div.row > span.row)", text: "kept as draft" },
    },
    {
      target: { selector: ".step-footer .next", text: "Continue" },
      action: "click",
      title: "Next: connect where agents work",
      body: "Rules only count where Wrapbox can see agents act. For coding agents it recommends four places. First: company laptops, marked ENFORCED, meaning Wrapbox can stop an action, not just watch.",
      waitFor: { selector: ".card .card", text: "macOS Endpoint runtime" },
    },
    {
      target: { selector: "button", text: "Connect", exact: true },
      action: "click",
      title: "Connect the company laptops",
      body: "IT pushes Wrapbox to company Macs through its device management tool, simulated here. Once laptops check in, what coding agents do to files and commands is checked before it runs.",
      waitFor: { selector: ".card .card", text: "Connected · Endpoint" },
    },
  ],
};
export default c;
