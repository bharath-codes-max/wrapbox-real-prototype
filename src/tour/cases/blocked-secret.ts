import type { TourCase } from "../types";

// Daniel's coding agent reaches for the secrets file while debugging.
const c: TourCase = {
  id: "blocked-secret",
  order: 85,
  persona: { userId: "u-daniel", name: "Daniel Kim", role: "Developer" },
  title: "Stop an agent reading secrets",
  goal: "Daniel wants to see what happens when his coding agent, Claude Code, reaches for the file of passwords and keys while fixing a bug.",
  outcome: "The agent was stopped before it could read the file, told which rule applied and offered a safer path, and the attempt is on record for the security team.",
  start: "control",
  poster: 6,
  steps: [
    {
      target: { selector: ".rail-item", text: "Simulation Lab" },
      action: "click",
      title: "Open the Simulation Lab",
      body: "The laptop is simulated, but Veridian's real rules and Wrapbox's real decision engine are used, and every run is recorded.",
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
      body: "The agent asks to print the secrets file. Wrapbox holds the request on Daniel's laptop before it can run.",
      waitFor: { selector: ".aterm-line", text: "cat .env" },
    },
    {
      target: { selector: ".aterm-line", text: "Wrapbox(inspect)" },
      title: "Wrapbox looks inside first",
      body: "Before deciding, Wrapbox itself checks, on the laptop, what the file holds. It finds credentials, meaning things that unlock systems: two API keys and a password.",
      pad: 5,
    },
    {
      target: { selector: ".rule-item", text: "Agents must not read local secrets files" },
      title: "The company's own rule applies",
      body: "The Core Brain, Wrapbox's decision engine, finds one matching rule, Veridian's own from its Engineering guardrails: agents must not read local secrets files. That rule decides.",
      pad: 5,
    },
    {
      target: { selector: ".aterm-line", text: "Decision" },
      title: "Blocked before it ran",
      body: "BLOCK means the command never ran, so the agent never saw the keys. It is told why and offered a safer path: go on without the secret, or request a narrow exception.",
    },
    {
      target: { selector: ".rail-item", text: "Live Actions" },
      action: "click",
      title: "On record for the security team",
      body: "Live Actions lists every action Wrapbox checked, newest first. The attempt is already at the top.",
      waitFor: { selector: ".ecard", text: "secrets file .env" },
    },
    {
      target: { selector: ".ecard", text: "secrets file .env" },
      action: "click",
      title: "Open the full record",
      body: "The newest entry: blocked, high risk. Opening it shows the full record: Daniel, his laptop, Claude Code, and the exact command it tried.",
      waitFor: { within: ".drawer", selector: "dl.kv" },
    },
    {
      target: { within: ".drawer", selector: ".card", text: "Safe alternative" },
      title: "The reason stays on record",
      body: "Just under the rule that decided, the safer path is saved with the attempt, so anyone reviewing it later sees why the agent was stopped and what it could do instead.",
      pad: 10,
    },
  ],
};
export default c;
