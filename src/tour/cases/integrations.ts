import type { TourCase } from "../types";

// Priya checks where Wrapbox is plugged in and how much it can stop in each place,
// then sees what Wrapbox knows about every action and how one rule covers every
// way of doing the same thing. Everything shown lives on the Integrations page.
const c: TourCase = {
  id: "integrations",
  order: 105,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "See where Wrapbox is plugged in",
  goal: "Priya, the admin, wants to know where Wrapbox sits today, how much it can really stop in each place, and what it knows about every action.",
  outcome: "She knows where Wrapbox can stop actions and where it only watches, who is behind each action, and that one rule covers every way of doing the same thing.",
  start: "control",
  poster: 2,
  steps: [
    {
      target: { selector: ".rail-item", text: "Integrations" },
      action: "click",
      title: "Open Integrations",
      body: "Integrations shows every place Wrapbox checks what AI agents do: laptops, the network, and systems like GitHub and AWS. Its action counts come from actions Wrapbox recorded.",
      waitFor: { selector: ".page-head", text: "The places Wrapbox sits" },
    },
    {
      target: ".metricband",
      title: "How strong is each connection?",
      body: "Four connections are enforced: they can stop a bad action before it runs. Two are degraded, stopping actions but not in every case, and one can only watch for now.",
    },
    {
      // Also resets the page to this tab if an earlier run left another one open.
      target: { selector: "button.tab", text: "Connected systems" },
      action: "click",
      title: "Same checks behind every coding agent",
      body: "Under Connected systems, Claude Code, Cursor and Codex pass through the same checks. The terminal replays a real one: Claude Code ran tests on Daniel's laptop; Wrapbox held, checked, then allowed it.",
      // The trace itself: the whole terminal is taller than the space under the header.
      waitFor: ".aterm-body",
    },
    {
      target: { selector: ".ecard", text: "GitHub Organization" },
      title: "A fully enforced connection",
      body: "Pushes, pull requests and branch changes on the checkout-service code go through Wrapbox first, so it can stop a bad one. Two recorded agent actions went through it.",
    },
    {
      target: { selector: ".ecard", text: "macOS Endpoint runtime" },
      title: "Protection on the laptops",
      body: "On enrolled laptops, Wrapbox checks file access and program launches before they happen. Clipboard control is marked PENDING: planned, and not counted as protection yet.",
    },
    {
      target: { selector: ".ecard", text: "MCP registry" },
      title: "Watching, not yet stopping",
      body: "MCP servers give AI agents extra tools. Understood only means Wrapbox sees and sorts their calls but can't stop them yet; it also spotted one server nobody registered.",
    },
    {
      target: { selector: "button.tab", text: "Identity model" },
      action: "click",
      title: "Who is behind every action",
      body: "Priya opens the Identity model. It shows what every decision knows: who acted, on which laptop, with which agent, through what and on what.",
      waitFor: { selector: ".card", text: "is never an identity" },
    },
    {
      target: { selector: ".card", text: "is never an identity" },
      title: "One real action, fully traced",
      body: "The same action the terminal replayed: Daniel Kim, on his laptop, with Claude Code, on the checkout-service code. Every decision and record carries this chain, not just 'it came from Chrome'.",
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
      body: "Priya searches for one file. Deleting it with a shell command, a Python script or a Node.js script is the same DELETE, so one rule covers all three.",
      waitFor: ".ecard-grid",
      hold: 1800,
    },
  ],
};
export default c;
