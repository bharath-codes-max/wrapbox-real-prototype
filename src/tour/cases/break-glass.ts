import type { TourCase } from "../types";

// SEV-1: open a 20-minute emergency override for one system (AWS Production),
// watch the checkout hotfix deploy go through under it, watch a Safety Kernel
// rule still block a dangerous change on the same system, then end it early.
const c: TourCase = {
  id: "break-glass",
  order: 70,
  persona: { userId: "u-alex", name: "Alex Morgan", role: "Engineering Manager" },
  title: "Emergency override during an outage",
  goal: "Checkout is down, Alex's team has the fix ready, and every production deploy normally waits for an on-call engineer to approve it.",
  outcome: "The fix shipped under a 20-minute override for one system, Alex was told the moment it started, and a truly dangerous change still stayed blocked.",
  start: "breakglass",
  poster: 5,
  steps: [
    {
      target: { selector: ".field", text: "Reason (required)" },
      action: "type",
      text: "SEV-1: checkout down, hotfix v2.14.1 must ship now",
      title: "An emergency, in plain words",
      body: "Break Glass is Wrapbox's emergency override, and Priya, the admin, opens one for Alex's team. It won't switch on until someone writes a reason, and that reason stays on record.",
    },
    {
      target: { selector: ".field", text: "Covers only" },
      action: "select",
      value: "1",
      title: "One system, twenty minutes",
      body: "The fix ships to AWS Production, so the override covers only that one system. It lasts 20 minutes, can't be extended, and 60 is the most anyone gets.",
      waitFor: { selector: ".grid.g2", text: "Covers only" },
    },
    {
      target: { selector: "button", text: "Activate break-glass" },
      action: "click",
      title: "Switch it on, loudly",
      body: "One click and it's live: a countdown that can't be extended, the reason and requester on record, and Maya in security and Alex in engineering notified.",
      waitFor: { selector: "section.card", text: "BREAK-GLASS ACTIVE" },
    },
    {
      route: "simlab",
      target: { selector: "button.tab", text: "Gateway" },
      action: "click",
      title: "Where the fix gets checked",
      body: "Priya opens Simulation Lab, which plays agent actions through the same checks Wrapbox runs for real. The Gateway tab lists actions on company systems, like cloud accounts and databases.",
      waitFor: { selector: ".card > div", text: "Deploy checkout hotfix" },
    },
    {
      target: { selector: ".stream-item", text: "Deploy checkout hotfix" },
      action: "click",
      title: "Pick the hotfix deploy",
      body: "Claude Code, an AI coding agent, wants to ship the checkout fix to AWS Production. Normally that's REVIEW: company policy holds it until an on-call reliability engineer (SRE) approves.",
      waitFor: { selector: ".card", text: "Expected under the brief" },
    },
    {
      target: { selector: "button.btn-accent", text: "Run", exact: true },
      action: "click",
      title: "Run it: it goes through",
      body: "ALLOW: the deploy runs straight away. Wrapbox shows why: the company rule still asks for an SRE's yes, but the emergency override made the call.",
      waitFor: { selector: ".pipe-stage", text: "Decision: ALLOW" },
      pad: 0,
    },
    {
      target: { selector: ".stream-item", text: "Dangerous cloud IAM change" },
      action: "click",
      title: "Now try something dangerous",
      body: "Same system, very different action: an agent tries to give an automation account full admin power over AWS Production.",
      waitFor: { selector: ".card", text: "AdministratorAccess" },
    },
    {
      target: { selector: "button.btn-accent", text: "Run", exact: true },
      action: "click",
      title: "Still blocked, override or not",
      body: "BLOCK: it never runs. The Safety Kernel, Wrapbox's built-in safety rules, stopped it, and no emergency override can lift those, even on the covered system.",
      waitFor: { selector: ".pipe-stage", text: "Decision: BLOCK" },
      pad: 0,
    },
    {
      target: { selector: ".rail-item", text: "Break Glass" },
      action: "click",
      title: "Everything it let through",
      body: "Back on Break Glass, the one action the override let through is listed: the deploy. It is also stamped BREAK-GLASS in Evidence, Wrapbox's permanent record that can't be quietly changed.",
      waitFor: { selector: "section.card > div", text: "Overridden under this session" },
    },
    {
      target: { selector: "button", text: "End override now" },
      action: "click",
      title: "Fixed? End it now",
      body: "The fix is live, so the override ends early instead of running out the clock. Its record stays: the reason, the system, the time allowed and how many actions it overrode.",
      waitFor: { selector: ".ecard", text: "SEV-1" },
    },
  ],
};
export default c;
