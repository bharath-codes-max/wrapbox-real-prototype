import type { TourCase } from "../types";

// SEV-1: open a 20-minute emergency override for one system (AWS Production),
// watch the checkout hotfix deploy go through under it, watch a Safety Kernel
// rule still block a dangerous change on the same system, then end it early.
const c: TourCase = {
  id: "break-glass",
  order: 70,
  persona: { userId: "u-alex", name: "Alex Morgan", role: "Engineering Manager" },
  title: "Emergency override during an outage",
  goal: "Checkout is down and Alex's team has the fix, but every production deploy normally waits for a reliability engineer to approve it.",
  outcome: "The fix shipped under a 20-minute override for one system, Alex and security were notified on record, a truly dangerous change still stayed blocked, and the override ended early.",
  start: "breakglass",
  poster: 5,
  steps: [
    {
      target: { selector: ".field", text: "Reason (required)" },
      action: "type",
      text: "SEV-1: checkout down, hotfix v2.14.1 must ship now",
      title: "An emergency, in plain words",
      body: "Checkout is down. Priya, the admin, opens Break Glass, Wrapbox's emergency override, for Alex's team. It won't start without a written reason, which stays on record.",
      placement: "top",
    },
    {
      target: { selector: ".field", text: "Covers only" },
      action: "select",
      value: "1",
      title: "One system, twenty minutes",
      body: "The fix ships to AWS Production, so the override covers only that one system. It lasts 20 minutes, can't be extended, and 60 is the most anyone gets.",
      waitFor: { selector: ".grid.g2", text: "Covers only" },
      placement: "bottom",
    },
    {
      target: { selector: "button", text: "Activate break-glass" },
      action: "click",
      title: "Switch it on, loudly",
      body: "One click and it's live, with a countdown already running. It records the reason, who asked, and who was notified: Maya in security, and Alex.",
      waitFor: { selector: "section.card", text: "BREAK-GLASS ACTIVE" },
    },
    {
      route: "simlab",
      target: { selector: "button.tab", text: "Gateway" },
      action: "click",
      title: "Watch the fix get checked",
      body: "Simulation Lab runs agent actions on simulated systems through Wrapbox's real checks. The Gateway tab lists actions on company systems, each showing what Wrapbox would decide right now.",
      waitFor: { selector: ".card > div", text: "Deploy checkout hotfix" },
    },
    {
      target: { selector: ".stream-item", text: "Deploy checkout hotfix" },
      action: "click",
      title: "Normally, this waits for a yes",
      body: "Claude Code, Daniel's AI coding agent, ships the fix. It's usually REVIEW (paused until a reliability engineer approves), but with the override on, the forecast reads ALLOW.",
      waitFor: { selector: ".card", text: "Expected under the brief" },
    },
    {
      target: { selector: "button.btn-accent", text: "Run", exact: true },
      action: "click",
      title: "Run it: it goes through",
      body: "ALLOW: the deploy runs straight away. Wrapbox shows why: the company rule still asks for a reliability engineer's yes, but the emergency override made the call.",
      waitFor: { selector: ".pipe-stage", text: "Decision: ALLOW" },
      pad: 0,
    },
    {
      target: { selector: ".stream-item", text: "Dangerous cloud IAM change" },
      action: "click",
      title: "Now try something dangerous",
      body: "Same system, very different action: Claude Code tries to give an automation account full admin power over AWS Production.",
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
      body: "Back on Break Glass, everything the override let through fits on one line: the deploy. It's also stamped BREAK-GLASS in Evidence, the record of every decision Wrapbox makes.",
      waitFor: { selector: "section.card > div", text: "Overridden under this session" },
    },
    {
      target: { selector: "button", text: "End override now" },
      action: "click",
      title: "Fixed? End it now",
      body: "The fix is live, so the override is ended early. Its record stays: the reason, the system, the time allowed and the one action it overrode.",
      waitFor: { selector: ".ecard", text: "SEV-1" },
    },
  ],
};
export default c;
