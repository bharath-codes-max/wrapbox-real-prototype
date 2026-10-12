import type { TourCase } from "../../types";

// Priya writes a one-off job in plain English instead of filling out the form by
// hand. Compile turns her sentence into the same fields the structured Build tab
// uses — nothing she didn't say gets filled in, and nothing is created until she
// clicks Create task.
const c: TourCase = {
  id: "write-task",
  order: 56,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Write a task in plain English",
  goal: "Priya wants Finance to run a one-off data job today, without clicking through every field of a form by hand.",
  outcome: "Priya typed one paragraph, watched it turn into a real permission slip with every field filled in, and created the task without touching a single dropdown.",
  start: "tasks",
  poster: 4,
  steps: [
    {
      target: { selector: "button", text: "Write a new task" },
      action: "click",
      title: "A job from scratch, not a form",
      body: "Priya wants a one-off job done today: sync Friday's customer export. Instead of filling out every field, she writes it the way she'd say it to a person.",
      say: "Okay, Priya wants a one-off job done today: sync Friday's customer export. Instead of filling out every field, she's going to write it the way she'd say it to a person.",
      waitFor: ".task-create",
    },
    {
      target: ".task-create textarea",
      action: "type",
      text: "Title: Sync Friday's customer export.\nPriya in Finance asks Claude Code to do it. Approved by Daniel. Never touch production. Budget 20 files, 45 minutes.\n1. Read the customer export from src/exports\n2. Clean and reformat the export in src/exports\n3. Write the cleaned file to src/reports",
      title: "Say it the way you'd say it to a person",
      body: "One paragraph: who's asking, who approves, what's off-limits, the budget, and the steps in order.",
      say: "She types one paragraph: who's asking, who approves, what's off-limits, the budget, and the steps in order — no dropdowns yet.",
    },
    {
      target: { within: ".task-create", selector: "button", text: "Compile" },
      action: "click",
      title: "Compile, not create",
      body: "Wrapbox reads the sentence and fills in the same fields you'd fill in by hand. Nothing is created yet — this just moves her words into the Build tab.",
      say: "Priya hits Compile, and Wrapbox reads the sentence and fills in the same fields she'd fill in by hand. Nothing's created yet — this just moves her words into the Build tab.",
      waitFor: { selector: ".tab.active", text: "Build" },
    },
    {
      target: { within: ".task-create", selector: ".field", text: "Title" },
      title: "Every field, really filled in",
      body: "Title, team, agent, asker and approver all came straight from the sentence. Environment wasn't mentioned, so it stayed at its sensible default — nothing was guessed.",
      say: "And here's the thing: title, team, agent, asker and approver all came straight from the sentence. She never mentioned the environment, so it just kept its sensible default — nothing got guessed.",
    },
    {
      target: ".task-step-list",
      title: "Three steps, already checked",
      body: "Each step came out in order, with a dependency on the one before it — and each ALLOW chip is a live decision from the real engine, computed before the task even exists.",
      say: "The three steps came out in order, each one depending on the last, and those ALLOW chips are live decisions from the real engine — computed before the task even exists.",
    },
    {
      target: { within: ".task-create", selector: "button", text: "Create task" },
      action: "click",
      title: "One click, the same check as the form",
      body: "Create task runs through the identical validator a hand-filled form would. If anything were missing, Wrapbox would refuse it here, same as always.",
      say: "Priya clicks Create task, and it runs through the exact same check a hand-filled form would. If anything were missing, Wrapbox would have refused it right here.",
      waitFor: { selector: ".ecard", text: "Just created" },
    },
    {
      target: { selector: ".ecard", text: "Just created" },
      title: "A real job, sitting beside the built-in ones",
      body: "It joins Start a task like any other job, runs through the identical engine, and can be started, parked and reviewed exactly the same way.",
      say: "And there it is — a real job sitting right beside the built-in ones, ready to run through the identical engine as any of them.",
      hold: 1800,
    },
  ],
};
export default c;
