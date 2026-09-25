import type { TourCase } from "../types";

// Daniel, a developer, has joined Veridian (the seeded setup checklist marks it
// done). The story is what that means for his AI coding agent: it is registered
// to him, an everyday request runs untouched, a request for secrets is stopped
// before it runs, and both land on his agent's record.
const c: TourCase = {
  id: "employee-join",
  order: 15,
  persona: { userId: "u-daniel", name: "Daniel Kim", role: "Developer" },
  title: "A new developer's agent, governed",
  goal: "Daniel has joined Veridian as a developer, and his AI coding agent must be governed without slowing his work.",
  outcome: "His everyday agent work runs untouched, a grab for secrets is stopped before it runs, and both land on his agent's record.",
  start: "start",
  poster: 6,
  steps: [
    {
      target: { selector: ".setup-step", text: "An employee joins" },
      title: "A new developer on the team",
      body: "The setup checklist shows Daniel Kim has joined Veridian as a developer. Now we follow what that means for his AI coding agent.",
    },
    {
      target: { selector: ".rail-item", text: "Agents" },
      action: "click",
      title: "His coding agent is known",
      body: "Wrapbox lists Claude Code under Daniel's name, on his laptop Daniel-MBP, with the tools it uses and where it can send data. So far: 10 events, 2 blocked.",
      waitFor: { selector: ".ecard", text: "Claude Code" },
    },
    {
      target: { selector: ".rail-item", text: "Simulation Lab" },
      action: "click",
      title: "Watch his agent at work",
      body: "The Simulation Lab plays an agent's request through Wrapbox. As this note says, the laptop is simulated, but the decision comes from the company's real rules.",
      waitFor: { selector: ".sim-note", text: "Environments simulated" },
    },
    {
      target: { selector: "[role=tab]", text: "Endpoint" },
      action: "click",
      title: "Actions on a person's laptop",
      body: "Endpoint means actions on a person's own laptop: the files an agent opens and the commands it runs. Every scenario here is Daniel's.",
      waitFor: { selector: ".card", text: "Daniel asks Claude Code to fix checkout" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "An everyday task just runs",
      body: "Claude Code reads a source file to fix checkout. Wrapbox holds it for a moment, finds the rule that lets coding agents read code, and lets it run.",
      waitFor: { selector: ".aterm-line", text: "Decision ALLOW" },
      hold: 2400,
    },
    {
      target: { selector: ".stream-item", text: "Agent reads .env" },
      action: "click",
      title: "Now a riskier request",
      body: "Chasing a config problem, the agent tries to open .env, a file of passwords and keys. 'Right now: BLOCK' is Wrapbox's forecast under today's rules; now we play it for real.",
      waitFor: { selector: ".card", text: "attempts to read .env" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Secrets stay locked",
      body: "Wrapbox finds two API keys and a password inside, and the rule against reading secrets files stops it. BLOCK means the agent never gets the file, and is offered a safer path.",
      waitFor: { selector: ".aterm-line", text: "Decision BLOCK" },
      hold: 2400,
    },
    {
      target: { selector: ".rail-item", text: "Agents" },
      action: "click",
      title: "Both tries are counted",
      body: "Claude Code now shows 12 events and 3 blocked, up from 10 and 2 before we started. Every request is recorded, with no extra work for Daniel.",
      waitFor: { selector: ".ecard dd", text: "12 events" },
      pad: 10,
    },
    {
      target: { selector: ".ecard", text: "Claude Code" },
      action: "click",
      title: "One record for his agent",
      body: "Claude Code's own record now starts with the two requests we just played: secrets read blocked, source read allowed. Its earlier history sits below.",
      waitFor: { selector: ".drawer div.small", text: "Tried to open the secrets file" },
      hold: 2400,
    },
  ],
};
export default c;
