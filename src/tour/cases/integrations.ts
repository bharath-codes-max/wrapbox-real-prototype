import type { TourCase } from "../types";

// Priya checks where Wrapbox is plugged in and how much it can stop in each place,
// then sees what Wrapbox knows about every action and how one rule covers every
// way of doing the same thing. Everything shown lives on the Integrations page.
// Statuses come from the capability registry (4 enforced, 2 degraded, 1 understood
// only); counts and the replayed action (evt-00020) come from the demo workspace.
const c: TourCase = {
  id: "integrations",
  order: 105,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "See where Wrapbox is plugged in",
  goal: "Priya, the admin, wants to know where Wrapbox sits today, how much it can really stop in each place, and what it knows about every action.",
  outcome: "Priya knows where Wrapbox can stop actions and where it only watches, who is behind each action, and that one rule covers every way of doing the same thing.",
  start: "control",
  poster: 2,
  steps: [
    {
      target: { selector: ".rail-item", text: "Integrations" },
      action: "click",
      title: "Open Integrations",
      body: "Priya, the admin, wants to see where Wrapbox is plugged in. Integrations lists every place it checks AI agents: laptops, the network, GitHub, AWS and more.",
      waitFor: { selector: ".page-head", text: "The places Wrapbox sits" },
    },
    {
      target: ".metricband",
      title: "How strong is each connection?",
      body: "Four connections are enforced: Wrapbox can stop a bad action there before it runs. Two are degraded, stopping most but not all, and one can only watch.",
    },
    {
      // Also resets the page to this tab if an earlier run left another one open.
      target: { selector: "button.tab", text: "Connected systems" },
      action: "click",
      title: "Every coding agent, same checks",
      body: "Claude Code, Cursor and Codex go through the same checks. This terminal replays a recorded action: tests run on Daniel's laptop, held and checked by Wrapbox, then allowed.",
      // The trace itself: the whole terminal is taller than the space under the header.
      waitFor: ".aterm-body",
    },
    {
      target: { selector: ".ecard", text: "GitHub Organization" },
      title: "A fully enforced connection",
      body: "Pushes, pull requests and branch changes on the checkout-service code go through Wrapbox first, so it can stop a bad one. Two recorded actions went through here.",
    },
    {
      target: { selector: ".ecard", text: "macOS Endpoint runtime" },
      title: "Protection on the laptops",
      body: "On enrolled laptops, Wrapbox checks file access and program launches before they happen. Clipboard control is marked PENDING: planned, and not counted as protection yet.",
    },
    {
      target: { selector: ".ecard", text: "MCP registry" },
      title: "Watching, not yet stopping",
      // The card's 2 recorded actions are the unregistered server's network sends, which the
      // Network Extension blocked, so don't imply Wrapbox failed to stop that server.
      body: "MCP servers give AI agents extra tools. “Understood only” means Wrapbox sees and sorts their calls but can't stop them yet, and it has spotted one unregistered server.",
    },
    {
      target: { selector: "button.tab", text: "Identity model" },
      action: "click",
      title: "Who is behind every action",
      body: "Priya opens the Identity model. It shows what every decision knows: who acted, on which laptop, with which agent, through which tool, and on which system.",
      waitFor: { selector: ".card", text: "is never an identity" },
    },
    {
      target: { selector: ".card", text: "is never an identity" },
      title: "One action, fully traced",
      body: "The same action the terminal replayed: Daniel Kim, on Daniel-MBP, with Claude Code, through the terminal, on checkout-service. Every decision and evidence record carries this chain.",
    },
    {
      target: { selector: "button.tab", text: "Action ontology" },
      action: "click",
      title: "Many ways, one plain verb",
      body: "Agents can do the same thing in many ways. The Action ontology, Wrapbox's dictionary of actions, turns each way into one plain verb, like DELETE.",
      waitFor: { selector: ".ecard", text: "rm build/tmp.txt" },
    },
    {
      target: { within: ".fbar", selector: ".fsearch" },
      action: "type",
      text: "tmp.txt",
      title: "One rule covers every way",
      body: "Priya searches for one file. Deleting it with a shell command, Python or Node.js is the same DELETE, so one rule about deleting covers all three.",
      waitFor: ".ecard-grid",
      hold: 1800,
    },
  ],
};
export default c;
