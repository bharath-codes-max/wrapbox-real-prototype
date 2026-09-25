import type { TourCase } from "../types";

// Sam hands the Q3 revenue report to the finance agent. The routine steps run
// on their own; the bulk customer export parks for Maya, who steers it to the
// safer version, and the job finishes by itself with a record of her decision.
const c: TourCase = {
  id: "finance-report",
  order: 62,
  persona: { userId: "u-sam", name: "Sam Rivera", role: "Finance Controller" },
  title: "Build a report, safely",
  goal: "Sam needs the Q3 revenue report and wants the finance agent to build it without free rein over customer data.",
  outcome: "The routine work ran on its own, the one risky export waited for Maya, and the report finished using the safer version she chose, with a record of who decided.",
  start: "tasks",
  poster: 2,
  steps: [
    {
      target: { selector: ".ecard", text: "Prepare the Q3 revenue report" },
      title: "A job with a permission slip",
      body: "Sam asks the finance agent for the Q3 revenue report. The job comes with limits, and a named approver for anything risky: Maya, not Sam.",
    },
    {
      // The second "Start" on the page belongs to the Finance card.
      target: { selector: "button", text: "Start", exact: true, nth: 1 },
      action: "click",
      title: "Start the job, inside its limits",
      body: "Sam presses Start. The agent may use customer data and write and send the report, but never passwords, secret files or the payments database.",
      waitFor: { selector: ".grid.g2", text: "Forbidden" },
    },
    {
      target: ".scroll-thin",
      title: "Routine steps ran on their own",
      body: "Wrapbox checked each step just before it ran. Four got ALLOW, meaning cleared to run: both revenue queries, the charts and the summary. No one had to approve them.",
    },
    {
      target: { selector: ".card .card", text: "Safe Continuation active" },
      title: "One step is paused",
      body: "Safe Continuation: the customer export is parked until a person decides, while the rest carries on. Only sending the report to the CFO waits for it.",
    },
    {
      target: { selector: "a", text: "Review Center" },
      action: "click",
      title: "It goes to Maya, not Sam",
      body: "The request lands in the Review Center for Maya, the security analyst. The person who asked can never approve their own request.",
      waitFor: { selector: ".ecard-fields", text: "Decides" },
    },
    {
      target: { selector: ".card", text: "Safer alternative" },
      title: "Why it was held",
      body: "A company rule says bulk exports of customer records need a security review, and this one is 50,000 rows. The card offers a safer option: a summary, or 500 rows at most.",
    },
    {
      target: { selector: "button", text: "Constrain" },
      action: "click",
      title: "Maya picks the safer version",
      body: "Not just yes or no: Maya picks Constrain, so the export may run only in that safer form. Nothing is left waiting in her queue.",
      waitFor: { selector: ".card", text: "Nothing waiting" },
    },
    {
      target: { selector: ".rail-item", text: "Tasks" },
      action: "click",
      title: "The job carried on by itself",
      body: "Back in Tasks, Sam's job is no longer in progress: it has moved to Finished. Maya's decision restarted it automatically; nobody had to run it again.",
      waitFor: { selector: ".tab", text: "Finished" },
    },
    {
      target: { selector: ".tab", text: "Finished" },
      action: "click",
      title: "The report is finished",
      body: "All six steps now show done, and the report went to the CFO. Step 4 keeps its REVIEW tag to show it was held. The job is marked COMPLETED.",
      waitFor: ".scroll-thin",
    },
    {
      target: { within: ".scroll-thin", selector: "div", text: "Export every customer" },
      action: "click",
      title: "A record of who decided",
      body: "Clicking the export step opens its record: outcome constrained, decided by Maya Chen, under the rule that held it. The 50,000 above is what the agent first asked for.",
      waitFor: { within: ".drawer", selector: "dl.kv", text: "Reviewer" },
    },
  ],
};
export default c;
