import type { TourCase } from "../types";

// Alex, the engineering manager, reviews the everyday ("standing") permission
// the team's coding agent holds on checkout-service: what it may do on its own,
// what it may not, and what revoking it would change (the page re-checks the
// agent's recorded everyday actions with the permission removed). Alex revokes
// it — the card asks to confirm, with that impact in view — sees it counted and
// kept on record, then grants it again on a fresh 7-day window.
// Note: the page records a re-grant under the prototype's signed-in admin
// (standing.tsx grantStandingAgain(p.id, "u-priya")), so the restored card says
// "Granted by Priya Menon"; the last step says so plainly.
const c: TourCase = {
  id: "standing-permissions",
  order: 65,
  persona: { userId: "u-alex", name: "Alex Morgan", role: "Engineering Manager" },
  title: "Revoke and restore an agent's permission",
  goal: "Alex wants to see what the team's coding agent may do on its own every day, and how quickly that can be taken back.",
  outcome: "Alex saw what Claude Code may and may not do and what revoking would change, pulled the permission in two clicks, then restored it on a fresh 7-day clock.",
  start: "control",
  poster: 2,
  steps: [
    {
      target: { selector: ".rail-item", text: "Standing Permissions" },
      action: "click",
      title: "Open Standing Permissions",
      body: "Alex runs engineering. Standing Permissions lists what each AI agent may do every day without asking, so routine work doesn't wait for a person.",
      waitFor: ".page-head",
    },
    {
      target: { selector: ".ecard", text: "Claude Code — everyday permission" },
      title: "What Claude Code may do alone",
      body: "Claude Code may edit code on feature branches, kept apart from the main code, and run tests. Pushing to main or touching production never happens on its own.",
    },
    {
      target: { within: ".ecard", selector: "dd", text: "Used 2 times" },
      title: "What revoking would change",
      body: "Wrapbox re-checks Claude Code's 2 recorded actions without this permission. A feature-branch push would go from running alone (ALLOW) to waiting for a person (REVIEW).",
      pad: 10,
    },
    {
      target: { selector: "button", text: "Revoke", exact: true },
      action: "click",
      title: "Revoke, with the impact in view",
      body: "Alex clicks Revoke. Nothing changes yet: the card asks to confirm, with that impact still in view.",
      waitFor: { selector: ".ecard-body", text: "Revoke Claude Code's everyday permission" },
    },
    {
      target: { selector: "button", text: "Yes, revoke" },
      action: "click",
      title: "Confirm, and it takes effect",
      body: "Alex confirms, and it applies at once. Claude Code's card leaves the Active list, and the counts at the top update.",
      waitFor: ".metricband",
      placement: "bottom",
    },
    {
      target: { selector: ".metric", text: "Revoked / expired" },
      title: "What “needs a yes again” means",
      body: "Until someone grants it again, none of Claude Code's everyday work on checkout-service runs on its own. What used to run freely now waits for a person's approval.",
      pad: 6,
    },
    {
      target: { selector: "[role=tab]", text: "Revoked & expired" },
      action: "click",
      title: "Kept on record, ready to restore",
      body: "The permission isn't deleted. It moves to Revoked & expired with its limits intact, and its card says Claude Code's work there needs a human yes.",
      waitFor: { selector: ".ecard", text: "REVOKED" },
    },
    {
      target: { selector: "button", text: "Grant again for 7 days" },
      action: "click",
      title: "Grant it back, time-boxed",
      body: "It comes back for 7 days only. When they run out, it lapses by itself and Claude Code's work needs a yes again.",
      waitFor: { selector: ".card.empty", text: "Nothing revoked or expired" },
    },
    {
      target: { selector: "[role=tab]", text: "Active" },
      action: "click",
      title: "Back in force for 7 days",
      body: "Claude Code is Active again for 7 days, same limits, so feature-branch pushes run alone again. “Granted by” names Priya: the demo is signed in as its admin.",
      waitFor: { selector: ".ecard", text: "Claude Code — everyday permission" },
    },
  ],
};
export default c;
