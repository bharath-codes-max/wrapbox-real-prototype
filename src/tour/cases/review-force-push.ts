import type { TourCase } from "../types";

// Alex decides on a held action in the Review Center. Just before the story
// starts (setup), Daniel's coding agent asked to force-push over main in
// production; the company's Engineering guardrails rule sent it to REVIEW.
// Alex reads who asked, why it was held, what it would touch and the safer
// route, then denies it. The product records the denial: the request moves to
// Resolved, and its record ends "denied by Alex Morgan" / "Action remained blocked".
const c: TourCase = {
  id: "review-force-push",
  order: 50,
  persona: { userId: "u-alex", name: "Alex Morgan", role: "Engineering Manager" },
  title: "Decide on a risky push",
  goal: "Moments ago, Daniel's coding agent tried to overwrite main, the team's primary copy of the code (a \"force-push\"), and Wrapbox held it until a person decides.",
  outcome: "Alex denied the push with the full picture in front of him; it never ran, and the record shows who asked, which rule held it and who decided.",
  start: "control",
  setup: ["simulate:gw-force-main"],
  // The poster is captured after its step's action: the full record (reason, safer route,
  // review outcome and the rule that decided) tells the whole story in one frame.
  poster: 8,
  steps: [
    {
      target: { selector: ".rail-item", text: "Review Center" },
      action: "click",
      title: "Open the Review Center",
      body: "Moments ago, Daniel's coding agent tried to overwrite main, the team's primary copy of the code (a \"force-push\"). Wrapbox held it for a person to decide, so Alex opens the Review Center.",
      waitFor: { selector: ".ecard-head", text: "force-push" },
    },
    {
      target: { selector: ".ecard-fields", text: "Requested by" },
      title: "Who asked, and who decides",
      body: "Daniel's agent made the request. Alex, the engineering manager, is the one who decides — Wrapbox never lets the person who asked approve their own request.",
    },
    {
      target: { selector: ".card .spread", text: "git push --force origin main" },
      title: "The exact action, word for word",
      body: "The agent wants to force-push to the checkout service's main, in production, the live system. REVIEW means it is paused until a person says yes or no.",
      placement: "top",
    },
    {
      target: { selector: ".grid.g3 > div", text: "Why" },
      title: "Why Wrapbox held it",
      body: "The company's own rule, from its Engineering guardrails: force pushes to main require engineering review. Wrapbox quotes the exact rule, so nobody has to guess.",
      placement: "top",
    },
    {
      target: { selector: ".grid.g3 > div", text: "Blast radius" },
      title: "What it would affect",
      body: "Blast radius means how much it would touch: 14 saved changes (commits) rewritten on main, which is locked down (\"protected\"), across 31 files. That could erase teammates' work.",
      placement: "top",
    },
    {
      target: { selector: ".grid.g3 > div", text: "Safer alternative" },
      title: "A safer way to get there",
      body: "Wrapbox suggests another route: put the change on a separate copy (a new branch) and open a pull request, a formal ask for teammates to review it before it reaches main.",
      placement: "top",
    },
    {
      target: { selector: "button", text: "Deny", exact: true },
      action: "click",
      title: "Alex denies the push",
      body: "He could approve it, approve it with limits, or steer it to the safer route. Rewriting main is too risky, so he denies it, and his queue clears.",
      placement: "top",
      waitFor: { selector: ".card.empty", text: "Nothing waiting" },
    },
    {
      target: { selector: "[role=tab]", text: "Resolved" },
      action: "click",
      title: "The decision is on record",
      body: "Under Resolved, the request now shows DENIED, with who asked, who decided and when. An earlier attempt, just below, was denied too.",
      waitFor: { selector: ".ecard", text: "Tried to force-push" },
    },
    {
      target: { selector: ".ecard", text: "Tried to force-push" },
      action: "click",
      title: "Open the full record",
      body: "Alex opens the request's full record. Its review section shows the outcome, denied, and names him as the reviewer.",
      waitFor: { within: ".drawer", selector: "dl.kv", text: "Reviewer" },
    },
    {
      target: { within: ".drawer", selector: ".pipe-stage", text: "Action remained blocked" },
      title: "The push never ran",
      body: "The record ends with the review, denied by Alex Morgan, and the outcome: the action remained blocked. Main was never rewritten.",
      pad: 10,
    },
  ],
};
export default c;
