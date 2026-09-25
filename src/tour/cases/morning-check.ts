import type { TourCase } from "../types";

// Maya's morning check: read the Control Room, then follow one number back to
// the recorded events behind it.
const c: TourCase = {
  id: "morning-check",
  order: 20,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "The morning security check",
  goal: "Maya starts her day by checking what the company's AI agents did and whether anything needs her.",
  outcome: "In a few clicks she knows what ran, what was stopped and what waits on a person — and can show the records behind the numbers.",
  start: "control",
  poster: 1,
  steps: [
    {
      target: ".metricband",
      title: "Four numbers to start the day",
      body: "AI agents at work (plus one unknown agent Wrapbox spotted), requests waiting for a person, blocked actions involving passwords or keys, and high-risk moments.",
    },
    {
      target: ".overview-decision",
      title: "What happened to every action",
      body: "Allowed ran as asked. Constrained ran only after Wrapbox made it safe. Reviewed waited for a person to decide. Blocked never ran at all.",
    },
    {
      target: 'button[aria-label="Reviews"]',
      title: "Nothing is waiting on her",
      body: "Requests that need a human yes or no show up here. This morning none are waiting — every held action was already decided.",
    },
    {
      target: { selector: ".metric", text: "Secrets protected" },
      action: "click",
      title: "Where does this number come from?",
      body: "Every tile links to where its number comes from. Maya clicks Secrets protected (blocked actions involving a password or key) and lands in Evidence.",
      waitFor: { selector: ".page-head", text: "Evidence Explorer" },
    },
    {
      target: { selector: ".fselect", text: "Decision" },
      action: "select",
      value: "BLOCK",
      title: "Show only what was stopped",
      body: "Evidence keeps a record of every action Wrapbox decided. Maya keeps only the blocked ones.",
      waitFor: ".fcount",
    },
    {
      target: ".fsearch input",
      action: "type",
      text: "CREDENTIAL.",
      title: "Narrow to passwords and keys",
      body: "Every password or key gets a label starting \"CREDENTIAL.\" Searching for that label leaves only the blocked actions that involved one.",
      waitFor: ".fcount",
    },
    {
      target: ".ecard-grid",
      title: "The number, record by record",
      body: "The cards match the Control Room tile one for one. Each is a recorded, blocked action: whose account, which agent, what data and when.",
    },
    {
      target: { selector: ".ecard", nth: 0 },
      action: "click",
      title: "Open one attempt",
      body: "One click shows the full record: whose laptop, which agent and where the key was headed. That agent is the unknown one the Control Room flagged.",
      waitFor: { within: ".drawer", selector: "dl.kv" },
    },
    {
      target: { within: ".drawer", selector: "ul", text: "Enterprise forbid" },
      title: "Why it was stopped",
      body: "The company's own rule says credentials must never be sent outside. Two always-on Wrapbox safety rules would have stopped it on their own too.",
    },
    {
      target: { within: ".drawer", selector: ".grid", text: "Blocked before transmission" },
      title: "Nothing left the device",
      body: "The private key never reached that unknown address. The counts Maya checked this morning — decisions, secrets, high-risk moments — are built from records exactly like this one.",
    },
  ],
};
export default c;
