import type { TourCase } from "../../types";

// The YC application video (~3 minutes). The script leads with WHO it is for and
// WHAT category it owns, then shows the real product doing it:
//
//   0:00  Hook — AI agents already act on real systems; one brain decides for all of them.
//   0:15  Who it's for — Priya (admin), Daniel (developer), Alex (eng manager), Sam (security).
//   0:28  Where it sits — not EDR, not MDM; a runtime for agent actions, in three places.
//   0:55  Device catches a secret — Daniel's agent reaches for .env; the company's rule blocks it.
//   1:25  Safety Kernel — a built-in rule previewed against the company's own history.
//   1:50  Policy Simulator — a company rule change previewed the same way, nothing live changes.
//   2:15  Human review + Break Glass — risky steps hold with blast radius; SEV-1 lifts the hold.
//   2:50  Close.
//
// Order 950 keeps it out of deck v2's slide list (CASES is filtered to order < 900).
const c: TourCase = {
  id: "yc-demo",
  order: 950,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Wrapbox — runtime authorization for AI agents",
  goal: "AI agents are already acting on real systems. Wrapbox is the agentic security runtime that decides what they're allowed to do, at the moment of action.",
  outcome: "A single decision engine catches every agent action on the device, over the network and at the gateway, decides it against the company's rules and a built-in Safety Kernel, previews every change against the company's own history, and lets a person hold or override anything with real stakes.",
  start: "control",
  setup: ["simulate:gw-force-main"],
  poster: 1,
  steps: [
    // ─── 1 · HOOK + WHO IT IS FOR ─────────────────────────────────────────────────
    {
      target: ".metricband",
      title: "The agentic security runtime.",
      body: "Claude Code, Codex, ChatGPT, Microsoft Copilot, your own agents, every MCP tool — one brain decides what each of them is allowed to do, at the moment of action.",
      say: "Wrapbox is the agentic security runtime. Claude Code, Codex, ChatGPT, Copilot, your own agents, every M-C-P tool — one brain decides what each of them is allowed to do, at the moment of action.",
      hold: 1800,
    },
    {
      target: ".ws-switch",
      title: "Four personas, one product.",
      body: "Priya, the admin, writes the rules. Daniel, a developer, runs the agents. Alex, an engineering manager, decides the risky calls. Sam, security, holds the final override.",
      say: "Four people use it: Priya the admin, Daniel the developer, Alex engineering, Sam security.",
      placement: "bottom",
      pad: 6,
      hold: 900,
    },

    // ─── 2 · WHAT WRAPBOX IS (and is NOT) ──────────────────────────────────────────
    {
      route: "brain",
      target: { selector: ".tab", text: "How it is built" },
      action: "click",
      title: "Not EDR. Not MDM. The agentic security runtime.",
      body: "EDR watches the laptop. MDM configures the device. Wrapbox sits between every agent and every action — Anthropic, OpenAI, Google, Microsoft, MCP tools, your own — and decides whether the action is allowed to run.",
      say: "Wrapbox is not E-D-R. Not M-D-M. It sits between every agent — Anthropic, Open-A-I, Google, Microsoft, M-C-P tools, your own — and every action, and decides whether that action runs.",
      waitFor: { selector: ".section-title", text: "One brain, three arms" },
      hold: 1200,
    },
    {
      target: { selector: ".section-title", text: "One brain, three arms" },
      title: "One brain. Three places.",
      body: "Device catches files, commands and browser agents. Network catches uploads and AI destinations. Gateway catches calls to GitHub, SQL, AWS, Stripe, MCP tools. One decision engine behind all three.",
      say: "One brain, three places. Device catches files and commands. Network catches what leaves. Gateway catches calls to Git-Hub, S-Q-L, A-W-S, M-C-P.",
      pad: 10,
      hold: 1400,
    },

    // ─── 3 · DEVICE: a real block in action ───────────────────────────────────────
    {
      route: "simlab",
      target: { selector: "[role=tab]", text: "Device" },
      action: "click",
      title: "A coding agent reaches for the secrets file.",
      body: "Daniel's agent is chasing a settings problem and tries to open .env, where the app keeps its passwords and keys.",
      say: "Watch one in action. Daniel's coding agent is chasing a settings problem and tries to open the dot env file, where the app keeps its passwords and keys.",
      waitFor: { selector: ".stream-item", text: "Agent reads .env" },
    },
    {
      target: { selector: ".stream-item", text: "Agent reads .env" },
      action: "click",
      title: "Caught on the device, read on the device, decided on the device.",
      body: "Wrapbox catches the command before it runs, reads what the file holds right there, and decides against the company's own rule — agents may not read local secrets files.",
      say: "Wrapbox catches the command before it runs, reads what the file holds right there, and decides against the company's own rule.",
      waitFor: { selector: ".card", text: "attempts to read .env" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Blocked before it runs.",
      body: "No agent in the chain of command can retry it. Every decision is recorded with its reasons; the Safety Kernel would have caught it too if the rule hadn't existed.",
      say: "Blocked before it runs. Nothing left the laptop, and the Safety Kernel would have caught it anyway if the rule hadn't existed.",
      waitFor: { selector: ".aterm-line", text: "Decision BLOCK" },
      hold: 1800,
    },

    // ─── 4 · SAFETY KERNEL: the default protection ─────────────────────────────────
    {
      route: "safety",
      target: ".kernel-impact",
      title: "Default protection, even without a rule.",
      body: "A new built-in rule arrives. Wrapbox replays it over every past action and shows what it would have changed. Nothing switches on blind.",
      say: "Even without your rules, the Safety Kernel is a built-in default. When a new rule arrives, Wrapbox replays it over every past action — nothing switches on blind.",
      hold: 1800,
    },

    // ─── 5 · POLICY SIMULATOR: preview a rule change ──────────────────────────────
    {
      route: "simulator",
      target: { selector: "label.rule-item", text: "Source code may go to approved AI" },
      action: "click",
      title: "Preview any rule change against your own history.",
      body: "Untick a company rule — nothing live changes — and Wrapbox replays twenty recorded actions. One past review would have been lost. The red flag is automatic.",
      say: "You can preview any rule change the same way. Untick a company rule, and Wrapbox replays twenty recorded actions. One past review would have been lost. The red flag is automatic.",
      waitFor: { selector: ".ecard", text: "3 of 4 on in preview" },
      hold: 1500,
    },

    // ─── 6 · HUMAN IN THE LOOP: review + break glass ──────────────────────────────
    {
      route: "reviews",
      target: { selector: ".ecard", text: "force-push" },
      title: "A person decides the risky step.",
      body: "Blast radius in view, safer alternative suggested, routed to the right person — never the one who asked.",
      say: "When something risky needs a yes, it holds here with its blast radius in view, routed to the right person, never the one who asked.",
      waitFor: { selector: ".ecard", text: "force-push" },
      hold: 1500,
    },
    {
      route: "breakglass",
      target: ".card",
      title: "A SEV-1 can lift the hold — never the Safety Kernel.",
      body: "Written reason, one system, twenty minutes, logged. Break Glass lets the fix ship. The Safety Kernel still stops anything truly dangerous.",
      say: "And in a real emergency, Break Glass lifts the hold for one system, time-boxed, with a written reason. It never lifts the Safety Kernel, so anything truly dangerous still stops.",
      waitFor: { selector: ".page-head", text: "Break Glass" },
      hold: 1800,
    },

    // ─── 7 · CLOSE ────────────────────────────────────────────────────────────────
    {
      route: "control",
      target: ".metricband",
      title: "Wrapbox is the agentic security runtime.",
      body: "One brain. Three places. Every action on record. Not watching the laptop — deciding what the agent is allowed to do, at the moment it tries.",
      say: "Wrapbox is the agentic security runtime. One brain. Three places. Every action on record.",
      waitFor: ".metricband",
      hold: 1600,
    },
  ],
};
export default c;
