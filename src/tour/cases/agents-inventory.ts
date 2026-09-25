import type { TourCase } from "../types";

// Priya reviews every AI agent in the company, including the one nobody registered.
const c: TourCase = {
  id: "agents-inventory",
  order: 90,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Know every AI agent",
  goal: "Priya wants one honest list of every AI agent at work in the company: who owns it, what it can reach, and any agent nobody registered.",
  outcome: "She has the full list, knows the one stranger holds no permissions and was blocked both times it tried, and has the records to prove it.",
  start: "control",
  poster: 2,
  steps: [
    {
      target: { selector: ".rail-item", text: "Agents" },
      action: "click",
      title: "Open the agent list",
      body: "Priya runs Wrapbox. The Agents page lists every AI agent spotted at work: 8 in all, 7 registered by an owner, and 1 'shadow' agent nobody registered.",
      waitFor: { selector: ".card", text: "Agents detected" },
    },
    {
      target: { selector: ".ecard", text: "Claude Code" },
      title: "Registered agents have an owner",
      body: "Each card shows who is accountable, who used it, its tools, where it can send data and how far it's trusted. Daniel owns Claude Code: trusted with conditions, moderate risk.",
    },
    {
      target: { selector: ".fselect", text: "Trust" },
      action: "select",
      value: "unknown",
      title: "Find the agent nobody vouches for",
      body: "Priya filters for agents whose trust is unknown. One is left: nobody registered it, nobody owns it, and Wrapbox rates it critical risk.",
      waitFor: { selector: ".ecard", text: "Unknown MCP agent" },
    },
    {
      target: { selector: ".ecard", text: "Unknown MCP agent" },
      action: "click",
      title: "See what Wrapbox knows about it",
      body: "Priya opens it. It was seen on Alex Morgan's finance laptop, working through a connector nobody registered, and talks to an internet address nobody recognises.",
      waitFor: { within: ".drawer", selector: "dl.kv" },
    },
    {
      target: { within: ".drawer", selector: ".card", text: "Why this appears here" },
      title: "Being seen is not being allowed",
      body: "Wrapbox spotted it in network traffic. Being spotted grants no permissions. 'Fail-safe' means every address it sends to is treated as unknown, and sensitive data is blocked from going there.",
    },
    {
      target: { within: ".drawer", selector: "div.small", text: "Tried to send" },
      title: "Two attempts, both blocked",
      body: "It tried twice to send files to that unknown address: an export of customer accounts and a private login key. Wrapbox blocked both before they ran.",
    },
    {
      target: { within: ".drawer", selector: "button", text: "Open Evidence" },
      action: "click",
      title: "Follow it to the evidence",
      body: "Priya follows the link to Evidence: the log of every decision Wrapbox has made, where each entry is linked to the one before, so any change shows.",
      waitFor: { selector: ".overview-card", text: "Tamper-evident ledger" },
    },
    {
      target: { selector: ".fselect", text: "Agent" },
      action: "select",
      value: "a-unknown-mcp",
      title: "Just this agent's records",
      body: "She narrows the log to the unknown agent: two records, both blocked. Each shows the person on that laptop, the data found inside, and its seal in the chain.",
      waitFor: ".ecard-grid",
    },
  ],
};
export default c;
