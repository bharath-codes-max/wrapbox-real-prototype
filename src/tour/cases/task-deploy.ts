import type { TourCase } from "../types";

// Alex's team runs a ten-step agent job; only the production deploy waits for him.
const c: TourCase = {
  id: "task-deploy",
  order: 55,
  persona: { userId: "u-alex", name: "Alex Morgan", role: "Engineering Manager" },
  title: "Approve one risky step mid-job",
  goal: "Daniel's coding agent is fixing a checkout bug, and Alex decides whether the fix may go to production.",
  outcome: "The safe steps ran on their own, the deploy waited for Alex's yes, and the whole job finished with his approval on record.",
  start: "tasks",
  poster: 3,
  steps: [
    {
      target: { selector: ".ecard", text: "Fix checkout and deploy" },
      title: "A coding job with limits",
      body: "Daniel asks Claude Code, an AI coding agent, to fix a checkout bug and ship it. The agent never touches production on its own: Alex must say yes first.",
    },
    {
      target: { within: ".ecard", selector: "button", text: "Start" },
      action: "click",
      title: "Start the job inside a box",
      body: "One click sets the agent to work inside a permission slip: only the places and actions listed here. Forbidden items, like production, can't happen without a person's yes.",
      waitFor: { selector: ".grid.g2", text: "Forbidden" },
      placement: "top",
    },
    {
      target: ".scroll-thin",
      title: "Every step is checked first",
      body: "Steps 1 to 5 are routine, so ALLOW: they just ran. Step 6 deploys to production, so REVIEW: Wrapbox parks it until a person says yes.",
      placement: "top",
    },
    {
      target: { selector: ".scroll-thin > div", text: "Verify production health" },
      action: "hover",
      title: "Safe work keeps going",
      body: "Steps 7 to 9 don't need the deploy, so they finished anyway. Only step 10, the production health check, waits for it.",
      waitFor: ".scroll-thin",
      placement: "top",
    },
    {
      target: { selector: "a", text: "Review Center" },
      action: "click",
      title: "Sent to the right person",
      body: "The task names who must decide: Alex, never Daniel, who asked for the change. The link opens the Review Center, where only exceptions like this wait.",
      waitFor: { selector: ".ecard-fields", text: "Decides" },
      pad: 10,
      placement: "top",
    },
    {
      target: { selector: ".card", text: "Waiting for approval to deploy" },
      title: "Everything needed to decide",
      body: "The exact command, the rule that held it, and a safer option: deploy to staging first. Alex sees it all before choosing.",
    },
    {
      target: { selector: "button", text: "Approve scoped" },
      action: "click",
      title: "Yes, for this job only",
      body: "Approve scoped lets this job, and only this job, keep using AWS Production until it's done. The review queue is now empty, and the health check won't have to ask again.",
      waitFor: { selector: ".card", text: "Nothing waiting" },
    },
    {
      target: { selector: ".rail-item", text: "Tasks" },
      action: "click",
      title: "The job picked up by itself",
      body: "Back in Tasks, nothing is parked and one job is completed. The moment Alex said yes, the task resumed without anyone restarting it.",
      waitFor: { selector: ".card", text: "finished within envelope" },
    },
    {
      target: { selector: ".tab", text: "Finished" },
      action: "click",
      title: "The extra access, on record",
      body: "The job moved to Finished. Alex's scoped yes is written into it: AWS Production, valid for this task only, with his name on it.",
      waitFor: { selector: ".card .card", text: "Extra scope approved" },
    },
    {
      target: { selector: ".scroll-thin > div", text: "Verify production health" },
      action: "hover",
      title: "All ten steps done",
      body: "The job is COMPLETED. Routine steps ran on their own, the deploy waited for Alex's yes, and the health check ran under his scoped approval.",
      waitFor: ".scroll-thin",
      placement: "top",
    },
  ],
};
export default c;
