import type { TourCase } from "../types";

// Maya investigates one blocked action end to end in Live Actions.
const c: TourCase = {
  id: "live-actions-investigate",
  order: 25,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "Investigate a blocked action",
  goal: "Maya wants to understand exactly why an AI agent was stopped from moving customer data out of the company.",
  outcome: "Maya knows who asked, what the agent tried, which rule stopped it and the safer path, all kept in one sealed evidence record.",
  start: "control",
  poster: 5,
  steps: [
    {
      target: { selector: ".rail-item", text: "Live Actions" },
      action: "click",
      title: "Open Live Actions",
      body: "Maya, a security analyst, wants to know exactly why an AI agent was stopped from moving customer data out. Every agent action Wrapbox checks is listed here.",
      waitFor: { selector: ".overview-card", text: "Live decision stream" },
    },
    {
      target: ".decision-legend",
      title: "Four possible outcomes",
      body: "Allowed runs as asked. Constrained runs in a safer form, for example with sensitive data masked. Reviewed waits for a person to approve. Blocked never runs.",
    },
    {
      target: { selector: ".fselect", text: "Decision" },
      action: "select",
      value: "BLOCK",
      title: "Show only what was blocked",
      body: "Maya narrows the list to actions Wrapbox stopped before they could run: 7 of the 20 recorded.",
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
      title: "Who asked, and what was tried",
      body: "Alex Morgan's Internal Finance Agent asked its database tool to copy half a million customer IDs and email addresses from live company systems to an outside site.",
    },
    {
      target: { within: ".drawer", selector: "ul" },
      title: "Three checks raised a flag",
      body: "Veridian's own rule asks for a security review of bulk exports, a built-in safety rule flags mass exports, and 500,000 rows is far over the 500-row limit.",
    },
    {
      target: { within: ".drawer", selector: ".card", text: "Safe alternative" },
      title: "A safer way forward",
      body: "The record doesn't just say no. It suggests a safer, smaller request: a summary, or a sample of 500 rows or fewer.",
    },
    {
      target: { within: ".drawer", selector: ".card", text: "This rule made the decision" },
      title: "The strictest rule decided",
      body: "Veridian's own rule would only have held it for a person to approve. Wrapbox's Safety Kernel, built-in rules no one can switch off, blocked it outright.",
    },
    {
      target: { within: ".drawer", selector: ".pipe" },
      title: "The whole story, one record",
      body: "Everything Maya just read is kept as one evidence record: the person, agent, tool, data found, destination, the rule that decided and the outcome.",
    },
    {
      target: { within: ".drawer", selector: ".row", text: "Evidence chain" },
      title: "Sealed, so any edit shows",
      body: "The code on the right seals the record's key facts and links to the previous record. Change any of those facts later and the seal stops matching.",
    },
  ],
};
export default c;
