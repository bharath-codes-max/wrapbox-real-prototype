import type { TourCase } from "../types";

// Jordan hands a whole support ticket to the Support Agent. The $1,240 refund
// is over the spending limit, so it parks and goes to Sam in Finance; the
// viewer plays Sam's part and approves it once, the decision is recorded under
// Sam's name, and the job then finishes by itself.
const c: TourCase = {
  id: "refund-task",
  order: 60,
  persona: { userId: "u-jordan", name: "Jordan Lee", role: "Support Lead" },
  title: "Refund waits for Finance",
  goal: "Jordan wants the Support Agent to resolve a refund ticket end to end, without giving it free rein over company money.",
  outcome: "The routine work ran on its own, the $1,240 refund waited for Sam in Finance, and the ticket closed once Sam's yes was on record.",
  start: "tasks",
  poster: 1,
  steps: [
    {
      // The four job cards each have a Start button; the refund job is the third.
      target: { selector: "button", text: "Start", exact: true, nth: 2 },
      action: "click",
      title: "Hand a whole ticket to an agent",
      body: "Jordan, a support lead, hands refund ticket #4821 to the Support Agent. Wrapbox checks each of its six steps before it runs, and one is held for a person straight away.",
      waitFor: { selector: ".card", text: "Task envelopes" },
      pad: 10,
    },
    {
      target: { selector: "[role=tab]", text: "In progress" },
      action: "click",
      title: "Every step is checked first",
      body: "ALLOW steps ran on their own. CONSTRAIN: the ticket went to the AI for a draft, with the customer's email and phone swapped for stand-ins. REVIEW: the refund waits for a person.",
      waitFor: { selector: ".scroll-thin", text: "Refund $1,240" },
    },
    {
      target: { selector: ".card .card", text: "Safe Continuation active" },
      title: "Only the refund needs a yes",
      body: "Safe Continuation: Wrapbox holds only the risky step, the refund, for Sam in Finance. Steps that don't need it are done; the reply and ticket close wait for it.",
      placement: "top",
    },
    {
      target: { selector: "a", text: "Review Center" },
      action: "click",
      title: "Go where approvals happen",
      body: "The Review Center is where people decide the few actions an agent may not take alone. A request never goes to the person who made it.",
      waitFor: ".page-head",
    },
    {
      target: { selector: "[role=tab]", text: "Awaiting your decision" },
      action: "click",
      title: "Waiting for Sam, not Jordan",
      body: "The request arrives with its context: Jordan asked, Sam in Finance decides, and three of the job's six steps are already done.",
      waitFor: { selector: ".ecard-fields", text: "Finance Controller" },
      pad: 12,
    },
    {
      // The whole request card: what Sam is asked to approve, and why it stopped.
      target: { selector: ".card", text: "exceeds budget" },
      title: "Why the refund stopped",
      body: "Any single action that spends more than $20 needs a person's yes, and this refund is $1,240. The Blast-Radius Governor named here is that spending cap.",
      placement: "top",
    },
    {
      target: { selector: "button", text: "Approve once" },
      action: "click",
      title: "Approve this refund, once",
      body: "Playing Sam's part, one click approves this refund only. It leaves the waiting list, and the agent gets no standing power to refund again.",
      waitFor: { selector: ".card.empty", text: "Nothing waiting" },
    },
    {
      target: { selector: "[role=tab]", text: "Resolved" },
      action: "click",
      title: "Sam's yes is on record",
      body: "Under Resolved, the refund now reads Approved once, with Jordan Lee as requester and Sam Rivera as approver. Who asked and who decided stay on record.",
      waitFor: { selector: ".ecard", text: "88142" },
    },
    {
      target: { selector: ".rail-item", text: "Tasks" },
      action: "click",
      title: "The job picks up again",
      body: "Back in Tasks: nothing parked, one job completed. Sam's yes was enough; the agent resumed on its own and nobody had to restart it.",
      waitFor: { selector: ".card", text: "Task envelopes" },
    },
    {
      target: { selector: "[role=tab]", text: "Finished" },
      action: "click",
      title: "Six steps, all done",
      body: "The refund went through once Sam approved; then the agent replied to the customer and closed the ticket. Every step keeps its decision on record.",
      waitFor: { selector: ".scroll-thin", text: "Close the ticket" },
    },
  ],
};
export default c;
