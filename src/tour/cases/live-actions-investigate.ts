import type { TourCase } from "../types";

// Maya investigates one blocked action end to end in Live Actions.
const c: TourCase = {
  id: "live-actions-investigate",
  order: 25,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "Investigate a blocked action",
  goal: "Maya wants to understand exactly why an AI agent was stopped from moving customer data out of the company.",
  outcome: "She knows who asked, what the agent tried, which rule stopped it and the safer path, all kept as one evidence record.",
  start: "control",
  poster: 5,
  steps: [
    {
      target: { selector: ".rail-item", text: "Live Actions" },
      action: "click",
      title: "Open Live Actions",
      body: "Every action that passes through Wrapbox, on work laptops, the company network or in front of tools like GitHub and databases, is checked and listed here, newest first.",
      waitFor: { selector: ".overview-card", text: "Live decision stream" },
    },
    {
      target: ".decision-legend",
      title: "Four possible outcomes",
      body: "Allowed runs as asked. Constrained runs with sensitive data swapped out. Reviewed waits for a person. Blocked never runs at all.",
    },
    {
      target: { selector: ".fselect", text: "Decision" },
      action: "select",
      value: "BLOCK",
      title: "Show only what was blocked",
      body: "Maya narrows the list to actions Wrapbox stopped before they could happen: 7 of the 20 recorded.",
      waitFor: ".fbar",
    },
    {
      target: { selector: ".ecard", text: "500,000 rows" },
      action: "click",
      title: "Open one blocked action",
      body: "A finance agent tried to copy 500,000 rows of customer data to an outside website. Maya opens the full record.",
      waitFor: { within: ".drawer", selector: "h2" },
    },
    {
      target: { within: ".drawer", selector: "dl.kv" },
      title: "Who, which agent, what it tried",
      body: "Alex Morgan's Internal Finance Agent asked its database tool to copy half a million rows of customer IDs and email addresses from live company systems to an outside site.",
    },
    {
      target: { within: ".drawer", selector: "ul" },
      title: "Why it was stopped",
      body: "Three reasons are listed: a company rule asks for a security review, a built-in safety rule flags a mass export, and 500,000 rows is far over the 500-row limit.",
    },
    {
      target: { within: ".drawer", selector: ".card", text: "Safe alternative" },
      title: "A safer way to get it done",
      body: "The record doesn't just say no. It suggests a safer, smaller request: a summary, or a sample of 500 rows or fewer.",
    },
    {
      target: { within: ".drawer", selector: ".rule-item" },
      title: "The company's own rule matched",
      body: "Wrapbox calls a company's written rules Intent Contracts. Veridian's rule for bulk exports of customer records matched: it asks for a security review, meaning a person must approve first.",
    },
    {
      target: { within: ".drawer", selector: ".card", text: "This rule made the decision" },
      title: "The stricter rule decided",
      body: "Wrapbox's built-in Safety Kernel, always-on rules no customer can switch off, blocked it outright. When rules disagree, the strictest one wins.",
    },
    {
      target: { within: ".drawer", selector: ".pipe" },
      title: "The whole story, kept as evidence",
      body: "Wrapbox keeps it all as one evidence record: the person, the agent, the tool, the data it found, the rule that decided, and the outcome.",
    },
  ],
};
export default c;
