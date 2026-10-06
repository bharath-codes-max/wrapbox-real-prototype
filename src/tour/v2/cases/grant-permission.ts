import type { TourCase } from "../../types";

// Priya gives Claude Code an everyday ("standing") permission on a disposable test
// database: it may read and write, but deleting stays a human decision. The form
// previews, with the real engine, what the permission would change; after granting,
// the same delete that used to run alone now waits for a person.
// The signed-in admin in this prototype is Priya Menon, so the card says so.
const c: TourCase = {
  id: "grant-permission",
  order: 66,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Give an agent an everyday permission",
  goal: "Daniel's coding agent keeps waiting for a yes on routine work in the test database. Priya wants to give it room to work, and keep deleting in human hands.",
  outcome: "Priya saw the effect of the permission before granting it, then watched the same delete go from running alone to waiting for a person.",
  start: "control",
  poster: 4,
  steps: [
    {
      target: { selector: ".rail-item", text: "Standing Permissions" },
      action: "click",
      title: "Open Standing Permissions",
      body: "Standing Permissions is where an admin decides what an AI agent may do every day without asking. Two permissions exist already.",
      say: "Okay, Standing Permissions is where an admin decides what an agent may do every day without asking. Two permissions exist already, and Priya wants to add a third.",
      waitFor: { selector: "button", text: "Grant permission" },
    },
    {
      target: { selector: "button", text: "Grant permission" },
      action: "click",
      title: "Grant a new permission",
      body: "Priya doesn't wait for a request to come in. The form says it plainly: inside the permission the work flows under your rules, outside it a person must say yes.",
      say: "Priya doesn't wait for a request to come in. The form says it plainly: inside the permission, work flows under your rules, and outside it, a person has to say yes.",
      waitFor: ".grant",
    },
    {
      target: { within: ".grant", selector: ".field", text: "System" },
      action: "select",
      value: "r-test-db",
      title: "Pick the system",
      body: "Claude Code is already chosen as the agent. Priya picks scratch-test-db, a disposable test database, so nothing important is at stake.",
      say: "Claude Code is already chosen as the agent. Priya picks the scratch test database, a disposable one, so nothing important is at stake.",
    },
    {
      target: { within: ".grant", selector: "button.grant-pick", text: "write and edit" },
      action: "click",
      title: "Say what it may do",
      body: "Reading is on already. Priya adds writing and editing, so routine work stops waiting. Deleting and deploying stay off.",
      say: "Reading is on already. Priya adds writing and editing, so routine work stops waiting for a person. Deleting and deploying stay switched off.",
    },
    {
      target: { within: ".grant", selector: ".field", text: "May not" },
      title: "And what it may never do",
      body: "“Anything in production” is on for a test system, so this permission can never reach the real databases, whatever happens.",
      say: "And here's what it may never do. Anything in production is switched on for a test system, so this permission can never reach the real databases.",
    },
    {
      target: ".grant-preview",
      title: "See the effect before you commit",
      body: "Wrapbox replays the recorded actions for this agent and system through the real engine. Deleting the test database would go from ALLOW to REVIEW, because delete is not in the permission.",
      say: "Before committing, Wrapbox replays the recorded actions for this agent and system through the real engine. Deleting the test database would go from allowed to review, because delete isn't part of the permission.",
    },
    {
      target: { within: ".grant", selector: "button", text: "Grant for" },
      action: "click",
      title: "Grant it for a week",
      body: "A permission always expires. This one lasts 7 days, and anything outside it waits for a person.",
      say: "A permission always expires. This one lasts seven days, and anything outside it waits for a person.",
      waitFor: { selector: ".ecard", text: "scratch-test-db" },
    },
    {
      target: { selector: ".ecard", text: "scratch-test-db" },
      title: "The third card",
      body: "It lists what Claude Code may do, what it may not, who granted it and when it expires. Revoking is one click, with its impact shown first.",
      say: "And here's the third card. It lists what Claude Code may do, what it may not, who granted it and when it expires. Revoking it is one click, with the impact shown first.",
    },
    {
      target: { selector: ".rail-item", text: "Simulation Lab" },
      action: "click",
      title: "Does it really change anything?",
      body: "To check, Priya replays the delete in the Simulation Lab, which plays practice actions through Wrapbox's real checks.",
      say: "To check, Priya replays that delete in the Simulation Lab, which plays practice actions through Wrapbox's real checks.",
      waitFor: { selector: "[role=tab]", text: "Context" },
    },
    {
      target: { selector: "[role=tab]", text: "Context" },
      action: "click",
      title: "Find the delete",
      body: "Context scenarios are about where an action happens. The delete of the test database is here.",
      say: "Context scenarios are about where an action happens, and the test database delete is right here.",
      waitFor: { selector: ".stream-item", text: "DELETE test database" },
    },
    {
      target: { selector: ".stream-item", text: "DELETE test database" },
      action: "click",
      title: "Pick the delete",
      body: "Claude Code drops scratch-test-db: local, disposable, 12 fixture rows. Before the permission, this simply ran.",
      say: "Claude Code drops the scratch test database: local, disposable, twelve fixture rows. Before the permission, this simply ran.",
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Now it waits for a person",
      body: "REVIEW: delete is outside what Claude Code may do alone, so a person has to say yes. The permission made the call, and recorded it.",
      say: "And now it waits for a person. Delete is outside what Claude Code may do alone, so someone has to say yes, and the permission made that call.",
      waitFor: { selector: ".aterm-line", text: "Decision REVIEW" },
      hold: 2400,
    },
  ],
};
export default c;
