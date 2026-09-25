import type { TourCase } from "../types";

// Maya maps which people use which AI agents and what those agents try to reach,
// traces the one unregistered agent to where it tried to send data, then opens
// the evidence record to confirm both of its attempts were blocked.
const c: TourCase = {
  id: "trust-graph",
  order: 95,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "See who talks to what",
  goal: "Maya wants one picture of which people use which AI agents, what those agents try to reach, and whether anything unknown is involved.",
  outcome: "She sees the whole company map in one view, traces the one unregistered agent from Alex Morgan to an unknown address, and confirms both of its attempts were blocked.",
  start: "control",
  poster: 6,
  steps: [
    {
      target: { selector: ".rail-item", text: "Trust Graph" },
      action: "click",
      title: "Open the Trust Graph",
      body: "Maya wants one picture of who uses which AI agents, and what those agents try to reach. Wrapbox draws it from every action the agents attempted, allowed or blocked.",
      waitFor: { selector: ".page-head", text: "Trust Graph" },
    },
    {
      target: ".metricband",
      title: "The numbers at a glance",
      body: "Six people, eight AI agents and twelve systems, files and addresses they used or tried to reach. One agent is a stranger nobody registered, and seven connections carried high-risk activity.",
    },
    {
      target: ".tg-canvas",
      title: "Read the map left to right",
      body: "People on the left, their AI agents in the middle, and what those agents used or tried to reach on the right. Thicker lines mean more activity; red lines mean high risk.",
    },
    {
      target: { selector: "svg text", text: "Unknown MCP agent" },
      title: "A red dot is a stranger",
      body: "Nobody at Veridian registered this \"Unknown MCP agent\", an unvetted AI tool plug-in. Wrapbox spotted it itself and marks it red, with the unknown address it tried to reach.",
      placement: "left",
      pad: 26,
    },
    {
      target: { selector: "[role=tab]", text: "Flagged relationships" },
      action: "click",
      title: "Open the watch list",
      body: "Each risky connection becomes a card with the reason it was flagged: seven high-risk lines, plus Alex Morgan's link to the stranger agent.",
      waitFor: { selector: ".card", text: "Risky relationship detected" },
    },
    {
      target: { selector: ".ecard", text: "Unknown external endpoint" },
      action: "click",
      title: "Trace the stranger's send attempts",
      body: "Two recorded attempts to send data to the unknown address, flagged three ways: high-risk activity, an unregistered agent, an unknown address. Clicking focuses the map on this agent.",
      waitFor: ".ecard.selected",
    },
    {
      target: { selector: "[role=tab]", text: "Relationship map" },
      action: "click",
      title: "Only its connections remain",
      body: "Back on the map, everything else fades. The stranger traces back to one person, Alex Morgan, and out to one place: the unknown address, over a red high-risk line.",
      waitFor: ".tg-canvas",
    },
    {
      target: { selector: ".metric.clickable", text: "High-risk edges" },
      action: "click",
      title: "Open the evidence behind it",
      body: "Did anything get out? Clicking the high-risk number opens the Evidence Explorer: the record of every action Wrapbox checked, with who, which agent, what data and the decision.",
      waitFor: { selector: ".page-head", text: "Evidence Explorer" },
    },
    {
      target: { selector: ".fselect", text: "Agent" },
      action: "select",
      value: "a-unknown-mcp",
      title: "Filter to the stranger agent",
      body: "Maya narrows the record to the Unknown MCP agent. Exactly two actions come back: the same two send attempts she traced on the map.",
      waitFor: { selector: ".fbar", text: "Showing 2 of" },
    },
    {
      target: ".ecard-grid",
      title: "Both attempts were blocked",
      body: "One tried to send a private key, the other a file of customer account numbers. Both say BLOCK: Wrapbox stopped them before anything went out.",
      placement: "top",
    },
  ],
};
export default c;
