import type { TourCase } from "../types";

// Alex, the engineering manager, reviews the everyday ("standing") permission
// his team's coding agent holds on checkout-service: what it may do on its own,
// what it may not, and what revoking it would change (the page re-checks the
// agent's recorded everyday actions with the permission removed). He revokes it
// — the card asks to confirm, with that impact in view — sees it counted and
// kept on record, then grants it again on a fresh 7-day window.
// Note: the page records a re-grant under the demo's signed-in admin (Priya),
// not the persona, so no caption says who re-granted it.
const c: TourCase = {
  id: "standing-permissions",
  order: 65,
  persona: { userId: "u-alex", name: "Alex Morgan", role: "Engineering Manager" },
  title: "Revoke and restore an agent's permission",
  goal: "Alex wants to see what his team's coding agent may do on its own every day, and how quickly he can take that back.",
  outcome: "He saw what Claude Code may and may not do and what revoking would change, pulled the permission in two clicks, then restored it on a fresh 7-day clock.",
  start: "control",
  poster: 2,
  steps: [
    {
      target: { selector: ".rail-item", text: "Standing Permissions" },
      action: "click",
      title: "Open Standing Permissions",
      body: "Alex runs the engineering team. This page lists what AI agents may do every day on their own, so routine work doesn't wait for a person.",
      waitFor: ".page-head",
    },
    {
      target: { selector: ".ecard", text: "Claude Code — everyday permission" },
      title: "What Claude Code may do alone",
      body: "On checkout-service it may edit code on side copies (feature branches) and run tests by itself. Changing the main code line, or anything in production, never runs without a person's yes.",
    },
    {
      target: { within: ".ecard", selector: "dd", text: "Used 2 times" },
      title: "What revoking would change",
      body: "Wrapbox re-checks the agent's past everyday actions without this permission. One of the two, a feature-branch push, would switch from running on its own (ALLOW) to waiting for a person (REVIEW).",
      pad: 10,
    },
    {
      target: { selector: "button", text: "Revoke", exact: true },
      action: "click",
      title: "Revoke, with the impact in view",
      body: "Alex clicks Revoke. Nothing changes yet: Wrapbox asks him to confirm, right below the impact he just read.",
      waitFor: { selector: ".ecard-body", text: "Revoke Claude Code's everyday permission" },
    },
    {
      target: { selector: "button", text: "Yes, revoke" },
      action: "click",
      title: "Confirm, and it takes effect",
      body: "He confirms, and it applies at once. Claude Code's card leaves the Active list, and the counts at the top update.",
      waitFor: ".metricband",
    },
    {
      target: { selector: ".metric", text: "Revoked / expired" },
      title: "What “needs a yes again” means",
      body: "Until someone grants it again, none of Claude Code's everyday work on checkout-service runs on its own. What used to run freely now waits for a person's approval.",
      pad: 10,
    },
    {
      target: { selector: "[role=tab]", text: "Revoked & expired" },
      action: "click",
      title: "Kept on record, ready to restore",
      body: "The permission isn't deleted. It moves to Revoked & expired with its limits intact, and its card now says Claude Code's work there needs a human yes.",
      waitFor: { selector: ".ecard", text: "REVOKED" },
    },
    {
      target: { selector: "button", text: "Grant again for 7 days" },
      action: "click",
      title: "Grant it back, time-boxed",
      body: "It goes back on, but only for 7 days. When that runs out, the permission lapses by itself and Claude Code must ask again unless someone renews it.",
      waitFor: { selector: ".card.empty", text: "Nothing revoked or expired" },
    },
    {
      target: { selector: "[role=tab]", text: "Active" },
      action: "click",
      title: "Back in force, fresh clock",
      body: "Claude Code is back on the Active list: ACTIVE, expiring in 7 days, with the same may and may-not lists. Its routine work runs on its own again.",
      waitFor: { selector: ".ecard-head", text: "Claude Code" },
      pad: 10,
    },
  ],
};
export default c;
