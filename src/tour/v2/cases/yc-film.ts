import type { TourCase } from "../../types";

// The 3-minute investor demo film (v2, 2026-10-10). Wider than yc-demo: it walks
// the whole product in one story — control room, shadow agent, plain-English
// policy, live tokenization + vault, device secret block, tasks with permission
// slips, review, break glass, safety kernel, policy simulator, core brain, close.
//
//   0:00  Hook — your company already has AI employees; Wrapbox decides for them.
//   0:10  Personas — Priya / Daniel / Alex / Maya, one product for all four.
//   0:20  Category — not EDR, not MDM: runtime authorization at the moment of action.
//   0:27  Control Room → shadow agent → Intent Studio → PII tokenized live →
//         Token Vault → device .env block → Tasks → Review → Break Glass →
//         Safety Kernel → Policy Simulator → Core Brain → close on Control Room.
//
// Order 960 keeps it out of deck v2's slide list (CASES filters to order < 900).
// Voice clips are OWNED by docs/_voice-film.ts (newest TTS snapshot, marin) —
// docs/_voice.ts skips this case so the two generators never fight.
const c: TourCase = {
  id: "yc-film",
  order: 960,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Wrapbox — runtime authorization for AI agents",
  goal: "AI agents are already acting on real systems. Wrapbox is the runtime that decides what each one is allowed to do, at the moment it acts.",
  outcome: "One decision engine catches every agent action on the device, over the network and at the gateway; rules are written in plain English, enforced live, previewed against history, and every decision is sealed into evidence.",
  start: "control",
  setup: ["simulate:gw-force-main"],
  poster: 0,
  steps: [
    // ── 1 · CONTROL ROOM — the morning view ─────────────────────────────────
    {
      route: "control",
      target: ".metricband",
      title: "Glycon's control room, three months in.",
      body: "Twenty agent actions decided — ten flowed, one rewritten in flight, two held for a human, seven stopped cold. Every single one on record.",
      say: "This is Glycon's control room, three months in. Twenty agent actions decided: ten flowed, seven stopped cold, and every single one is on record.",
      waitFor: ".metricband",
      hold: 900,
    },

    // ── 2 · SHADOW AGENT — the one nobody registered ────────────────────────
    {
      route: "agents",
      target: { selector: ".card", text: "Shadow agent discovered" },
      title: "The agent nobody registered.",
      body: "An unknown MCP process on a finance laptop, pushing data at an address nobody recognises. No owner, no permissions — everything it tries fails safe.",
      say: "And Wrapbox found the agent nobody registered — an unknown M-C-P process on a finance laptop. Everything it tries fails safe.",
      waitFor: { selector: ".card", text: "Shadow agent discovered" },
      pad: 6,
      hold: 900,
    },

    // ── 3 · INTENT STUDIO — policy in plain English ─────────────────────────
    {
      route: "intent",
      target: { selector: ".ecard", text: "External AI usage" },
      title: "Rules, written the way you'd say them.",
      body: "“Credentials must never be transmitted externally.” Wrapbox compiles the sentence into enforceable clauses — and only claims coverage its live checks can truthfully deliver.",
      say: "Rules are written the way you'd say them: credentials must never leave the company. Wrapbox compiles the sentence into enforceable clauses.",
      pad: 6,
      hold: 900,
    },

    // ── 4 · LIVE RUN — customer PII tokenized in flight ─────────────────────
    {
      route: "simlab",
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "A customer list heads to the approved AI.",
      body: "Wrapbox intercepts in flight, opens the file, finds every email and phone number — and swaps each one for a token. The work still happens; the data never leaves.",
      say: "Watch it live. Priya sends the customer list to the approved A-I. In flight, Wrapbox opens the file and swaps every email and phone number for a token. The work still happens — the data never leaves.",
      waitFor: { selector: ".pipe-stage", text: "Transform applied" },
      hold: 1400,
    },

    // ── 5 · TOKEN VAULT — the round trip ────────────────────────────────────
    {
      route: "vault",
      target: { selector: ".g3 > .card", text: "2 · The AI's reply" },
      title: "The AI answered with a stand-in.",
      body: "Real values wait in the Token Vault. Only someone inside the company can trade the token back for the truth — the AI never knew.",
      say: "The real values wait in the Token Vault — only someone inside the company can trade a token back for the truth. The A-I never knew.",
      pad: 6,
      hold: 900,
    },

    // ── 6 · DEVICE — same brain on the laptop ───────────────────────────────
    {
      route: "simlab",
      target: { selector: "[role=tab]", text: "Device" },
      action: "click",
      title: "Different place, same brain.",
      body: "This is Daniel's laptop, where his coding agent is debugging a settings problem.",
      say: "Different place, same brain. This is Daniel's laptop, where his coding agent is busy debugging.",
      waitFor: { selector: ".card", text: "caught at the device" },
    },
    {
      target: { selector: ".stream-item", text: "Agent reads .env" },
      action: "click",
      title: "The agent reaches for the secrets file.",
      body: ".env holds every password and key the app uses.",
      say: "And the agent reaches for dot env — the file with every password and key.",
      waitFor: { selector: ".card", text: "attempts to read .env" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Blocked before it runs.",
      body: "Caught on the device, read on the device, decided on the device. The agent is told which rule stopped it — and offered a safer path.",
      say: "Caught on the device, read on the device, blocked before it runs. The agent gets told why, and offered a safer path.",
      waitFor: { selector: ".aterm-line", text: "Decision" },
      hold: 1200,
    },

    // ── 7 · TASKS — autonomy with a permission slip ─────────────────────────
    {
      route: "tasks",
      target: { selector: ".ecard", text: "Fix checkout and deploy" },
      title: "Agents also work unattended.",
      body: "Four teams, four jobs. Each agent carries a short-lived permission slip: exactly what it may touch, for how long. Risky steps park for a person.",
      say: "Agents also work unattended — each one carries a permission slip: what it may touch, for how long. Risky steps park for a person.",
      pad: 6,
      hold: 800,
    },

    // ── 8 · REVIEW CENTER — the human yes ───────────────────────────────────
    {
      route: "reviews",
      target: { selector: ".ecard", text: "force-push" },
      title: "They park here.",
      body: "Blast radius in view, a safer alternative suggested, routed to the right approver — never the person who asked.",
      say: "It parks here — blast radius in view, safer alternative suggested, routed to the right approver. Never the one who asked.",
      waitFor: { selector: ".ecard", text: "force-push" },
      pad: 6,
      hold: 800,
    },

    // ── 9 · BREAK GLASS — the 2 a.m. story ──────────────────────────────────
    {
      route: "breakglass",
      target: ".card",
      title: "Real emergency? Break Glass.",
      body: "One system, twenty minutes, written reason, leadership notified, every override flagged in Evidence. It never lifts the Safety Kernel.",
      say: "Two A-M emergency? Break Glass: one system, twenty minutes, written reason, leadership notified. And it never lifts the Safety Kernel.",
      waitFor: { selector: ".page-head", text: "Break Glass" },
      pad: 6,
      hold: 900,
    },

    // ── 10 · SAFETY KERNEL — the floor ──────────────────────────────────────
    {
      route: "safety",
      target: ".kernel-impact",
      title: "The kernel is the floor.",
      body: "Built-in rules, shipped like virus definitions. Every update is replayed against your own history before it enforces. Nothing switches on blind.",
      say: "That kernel is the floor: built-in rules, replayed against your own history before they enforce. Nothing switches on blind.",
      hold: 900,
    },

    // ── 11 · POLICY SIMULATOR — foresight for your own rules ────────────────
    {
      route: "simulator",
      target: { selector: "label.rule-item", text: "Source code may go to approved AI" },
      action: "click",
      title: "Preview any rule change against history.",
      body: "Untick a rule — nothing live changes — and Wrapbox replays twenty recorded actions. One past review would have been lost. The red flag is automatic.",
      say: "Your own rules get the same treatment. Untick one, and Wrapbox replays twenty real actions — one past review would have been lost. The red flag is automatic.",
      waitFor: { selector: ".ecard", text: "3 of 4 on in preview" },
      hold: 900,
    },

    // ── 12 · CORE BRAIN — one engine behind everything ──────────────────────
    {
      route: "brain",
      target: { selector: ".tab", text: "How it is built" },
      action: "click",
      title: "One brain. Three places.",
      body: "Fifteen facts about each action, fourteen checks, three places — device, network, gateway. One decision, hash-sealed into Evidence.",
      say: "Behind everything, one Core Brain: fifteen facts per action, fourteen checks, three places. One decision, sealed into evidence.",
      waitFor: { selector: ".section-title", text: "One brain, three arms" },
      hold: 900,
    },

    // ── 13 · CLOSE ───────────────────────────────────────────────────────────
    {
      route: "control",
      target: ".metricband",
      title: "Wrapbox. Runtime authorization for AI agents.",
      body: "Your agents are already working. Wrapbox decides what they're allowed to do — at the moment they act. wrapbox.io",
      say: "Your agents are already working. Wrapbox decides what they're allowed to do. Wrapbox dot I-O.",
      waitFor: ".metricband",
      hold: 1000,
    },
  ],
};
export default c;
