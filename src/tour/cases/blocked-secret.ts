import type { TourCase } from "../types";

// Daniel's coding agent reaches for the secrets file while debugging.
const c: TourCase = {
  id: "blocked-secret",
  order: 85,
  persona: { userId: "u-daniel", name: "Daniel Kim", role: "Developer" },
  title: "Stop an agent reading secrets",
  goal: "Daniel wants to see what happens when a coding agent, Claude Code, reaches for the app's file of passwords and keys while fixing a bug.",
  outcome: "The command never ran, so the agent never saw the keys; it was told which company rule applied and offered a safer path, and the attempt is on record for the security team.",
  start: "control",
  poster: 6,
  steps: [
    {
      target: { selector: ".rail-item", text: "Simulation Lab" },
      action: "click",
      title: "Open the Simulation Lab",
      body: "Daniel wants to see what happens if a coding agent reaches for secrets. Here the laptop is simulated, but Veridian's rules and Wrapbox's decision engine are real.",
      waitFor: { selector: ".page-head", text: "Simulation Lab" },
    },
    {
      target: { selector: "[role=tab]", text: "Endpoint" },
      action: "click",
      title: "Look at the laptop",
      body: "Endpoint means a person's own computer: the files an AI agent opens and the commands it runs there.",
      waitFor: { selector: ".card", text: "in the Endpoint plane" },
    },
    {
      target: { selector: ".stream-item", text: "Agent reads .env" },
      action: "click",
      title: "Pick the situation",
      body: "Daniel's coding agent is chasing a settings problem and wants to open .env, a file of passwords and keys the app uses.",
      waitFor: { selector: ".card", text: "attempts to read .env" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Let the agent try",
      body: "The agent sends a command to show what's in the file. Wrapbox catches it on Daniel's laptop and holds it before it runs.",
      waitFor: { selector: ".aterm-line", text: "cat .env" },
    },
    {
      target: { selector: ".aterm-line", text: "Wrapbox(inspect)" },
      title: "Wrapbox looks inside first",
      body: "Before deciding, Wrapbox checks what the file holds, right on the laptop. It finds credentials, things that unlock systems: two API keys and a password.",
      pad: 5,
    },
    {
      target: { selector: ".rule-item", text: "Agents must not read local secrets files" },
      title: "Veridian's own rule decides",
      body: "The Core Brain, Wrapbox's decision engine, finds one matching rule, written by Veridian in its Engineering guardrails: agents must not read local secrets files.",
      pad: 5,
    },
    {
      target: { selector: ".aterm-line", text: "Decision" },
      title: "Blocked before it ran",
      body: "BLOCK means the command never ran, so the agent never saw the keys. It is told which rule stopped it.",
    },
    {
      target: { selector: ".rail-item", text: "Live Actions" },
      action: "click",
      title: "Logged for the security team",
      body: "Live Actions lists every action Wrapbox checked, newest first. The agent's blocked attempt is already at the top.",
      waitFor: { selector: ".ecard", text: "secrets file .env" },
    },
    {
      target: { selector: ".ecard", text: "secrets file .env" },
      action: "click",
      title: "Open the full record",
      body: "The newest entry: blocked, high risk. Opening it shows the full record: Daniel, the laptop, Claude Code, and the exact command it tried.",
      waitFor: { within: ".drawer", selector: "dl.kv" },
    },
    {
      target: { within: ".drawer", selector: ".card", text: "Safe alternative" },
      title: "Stopped, with a way forward",
      body: "Right under the rule that decided, the record keeps the safer path the agent was offered: carry on without the secret, or ask for a narrow exception.",
      pad: 10,
    },
  ],
};
export default c;
