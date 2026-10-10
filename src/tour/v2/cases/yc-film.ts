import type { TourCase } from "../../types";

// The 3-minute investor film, v3 (2026-10-10): five use-case stories from deck
// v2, each end-to-end, each opened by a curiosity question (the act cards in
// record-yc.tsx). Condensed from the proven cases blocked-secret,
// pii-tokenized, task-deploy, agents-inventory and break-glass.
//
//   Q1 · Can an agent steal your keys?    → .env read blocked on the device
//   Q2 · Where does customer data go?     → PII tokenized in flight + vault
//   Q3 · Can an agent own a whole job?    → permission slip, parked deploy, scoped yes
//   Q4 · The agent nobody hired           → shadow MCP agent, fails safe, on record
//   Q5 · 2 a.m. — production is down      → break glass, and what it still can't unlock
//
// Order 960 keeps it out of deck v2's slide list. Voice clips are OWNED by
// docs/_voice-film.ts — docs/_voice.ts skips this case on purpose.
const c: TourCase = {
  id: "yc-film",
  order: 960,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Wrapbox — runtime authorization for AI agents",
  goal: "AI agents are already acting on real systems. Five questions every company should ask — answered live by the real decision engine.",
  outcome: "Secrets stay on the laptop, customer data leaves only as tokens, whole jobs run on scoped permission slips, unregistered agents fail safe, and even a 2 a.m. override can't lift the Safety Kernel.",
  start: "control",
  poster: 2,
  steps: [
    // ── Q1 · CAN AN AGENT STEAL YOUR KEYS? (steps 0–2) ──────────────────────
    {
      route: "simlab",
      target: { selector: "[role=tab]", text: "Device" },
      action: "click",
      title: "Daniel's laptop. His agent is debugging.",
      body: "The laptop is simulated; the company's rules and the decision engine are real.",
      say: "First question. This is Daniel's laptop, and his coding agent is busy debugging a config issue.",
      waitFor: { selector: ".card", text: "caught at the device" },
    },
    {
      target: { selector: ".stream-item", text: "Agent reads .env" },
      action: "click",
      title: "It reaches for .env.",
      body: "The file with every password and key the app uses.",
      say: "And it reaches for dot env — the file with every password and key the app has.",
      waitFor: { selector: ".card", text: "attempts to read .env" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Blocked before it runs.",
      body: "Caught on the device, read on the device, decided on the device — and the agent is told which rule stopped it.",
      say: "Caught on the laptop, blocked before it ever runs — and the agent is told exactly which rule stopped it.",
      waitFor: { selector: ".aterm-line", text: "Decision" },
      hold: 1200,
    },

    // ── Q2 · WHERE DOES CUSTOMER DATA GO? (steps 3–5) ───────────────────────
    {
      target: { selector: "[role=tab]", text: "Network" },
      action: "click",
      title: "Priya sends the customer list to AI.",
      body: "An everyday moment: customers.csv attached to a prompt in the approved AI.",
      say: "Next question. Priya is sending the customer list to the approved A-I — an everyday moment.",
      waitFor: { selector: ".card", text: "Expected under the brief" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Every email and phone becomes a token.",
      body: "Intercepted in flight, inspected, tokenized. The AI still does the work — it never sees the real people.",
      say: "She hits send. In flight, Wrapbox opens the file and swaps every email and phone for a token. The A-I still does its job — it never sees the real people.",
      waitFor: { selector: ".pipe-stage", text: "Transform applied" },
      hold: 1500,
    },
    {
      route: "vault",
      target: { selector: ".g3 > .card", text: "2 · The AI's reply" },
      title: "The real values never left.",
      body: "They sit in the Token Vault. Only someone inside the company can swap a token back.",
      say: "The real values sit in the Token Vault. Only someone inside the company can ever swap them back.",
      pad: 6,
      hold: 900,
    },

    // ── Q3 · CAN AN AGENT OWN A WHOLE JOB? (steps 6–8) ──────────────────────
    {
      route: "tasks",
      target: { within: ".ecard", selector: "button", text: "Start" },
      action: "click",
      title: "A whole job, on a permission slip.",
      body: "Fix checkout and deploy. The agent gets thirty minutes and only what this job needs. Safe steps run; the production deploy parks for a human.",
      say: "Third question: can an agent own a whole job? One click — it gets a thirty-minute permission slip. Safe steps run; the production deploy parks.",
      waitFor: { selector: ".grid.g2", text: "Forbidden" },
      placement: "top",
    },
    {
      target: { selector: "a", text: "Review Center" },
      action: "click",
      title: "It waits for the right person.",
      body: "Routed to Alex — never to Daniel, who asked. Blast radius and a safer path included.",
      say: "The parked step lands with Alex — never with Daniel, who asked for the change.",
      waitFor: { selector: ".ecard-fields", text: "Decides" },
      pad: 10,
      placement: "top",
    },
    {
      target: { selector: "button", text: "Approve scoped" },
      action: "click",
      title: "One scoped yes. The job finishes itself.",
      body: "Yes to the deploy, for this job only. The queue empties and the task resumes on its own.",
      say: "One scoped yes — this job only — and the job picks up and finishes itself.",
      waitFor: { selector: ".card", text: "Nothing waiting" },
      hold: 900,
    },

    // ── Q4 · THE AGENT NOBODY HIRED (steps 9–10) ────────────────────────────
    {
      route: "agents",
      target: { selector: ".card", text: "Shadow agent discovered" },
      title: "Found in the traffic.",
      body: "An unknown MCP process on a finance laptop, pushing data at an address nobody recognises.",
      say: "Question four: who's the agent nobody hired? Wrapbox found one on a finance laptop, pushing data at a strange address.",
      pad: 6,
      hold: 800,
    },
    {
      target: { selector: ".ecard", text: "Unknown MCP agent" },
      action: "click",
      title: "No owner. No permissions. Fails safe.",
      body: "It tried twice — customer account numbers, then a private key. Blocked both times, with sealed records proving nothing left.",
      say: "No owner, no permissions — so everything it tries fails safe. It tried twice, and both attempts are blocked and on sealed record.",
      waitFor: { within: ".drawer", selector: "dl.kv" },
      hold: 900,
    },

    // ── Q5 · 2 A.M. — PRODUCTION IS DOWN (steps 11–16) ──────────────────────
    {
      route: "breakglass",
      target: { selector: ".field", text: "Reason (required)" },
      action: "type",
      text: "SEV-1: checkout down, hotfix must ship now",
      title: "Break Glass demands a reason.",
      body: "Checkout is down and the fix can't wait for sign-off. The override won't start without a written reason.",
      say: "Last question. It's two A-M, checkout is down, and the fix can't wait for sign-off. Break Glass — but it won't start without a written reason.",
      placement: "top",
    },
    {
      target: { selector: ".field", text: "Covers only" },
      action: "select",
      value: "1",
      title: "One system. Twenty minutes.",
      body: "Emergency authority covers only the production account the fix ships to. It can't be extended.",
      say: "One system only, twenty minutes, no extensions.",
      waitFor: { selector: ".grid.g2", text: "Covers only" },
      placement: "bottom",
    },
    {
      target: { selector: "button", text: "Activate break-glass" },
      action: "click",
      title: "Live — and loud.",
      body: "Security is notified, the countdown is ticking, and every action it overrides is flagged in Evidence. Now: what can it still not do?",
      say: "It's live — security notified, countdown ticking, the fix can ship. But what can the override still not do?",
      waitFor: { selector: "section.card", text: "BREAK-GLASS ACTIVE" },
      hold: 900,
    },
    {
      route: "simlab",
      target: { selector: "button.tab", text: "Gateway" },
      action: "click",
      title: "The deploy is already allowed.",
      body: "Under the override, the checkout hotfix reads ALLOW instead of waiting for review.",
      say: "Over at the gateway, the checkout deploy already reads allowed under the override.",
      waitFor: { selector: ".stream-item", text: "Dangerous cloud IAM change" },
    },
    {
      target: { selector: ".stream-item", text: "Dangerous cloud IAM change" },
      action: "click",
      title: "Now try something truly dangerous.",
      body: "Same covered system: the agent tries to grant full admin power over AWS Production.",
      say: "Now try something truly dangerous on the very same system — full admin power over production.",
      waitFor: { selector: ".card", text: "AdministratorAccess" },
    },
    {
      target: { selector: "button.btn-accent", text: "Run", exact: true },
      action: "click",
      title: "Still blocked. The kernel never lifts.",
      body: "The Safety Kernel sits under every override. No emergency can switch it off.",
      say: "Still blocked. The Safety Kernel sits underneath every override — no emergency can switch it off.",
      waitFor: { selector: ".pipe-stage", text: "Decision: BLOCK" },
      hold: 1400,
    },

    // ── CLOSE (step 17) ─────────────────────────────────────────────────────
    {
      route: "control",
      target: ".metricband",
      title: "Five questions. One brain.",
      body: "Every agent action — device, network, gateway — decided at the moment it happens, and on record. wrapbox.io",
      say: "Five questions, one answer — one brain deciding every agent action, the moment it happens. Wrapbox dot I-O.",
      waitFor: ".metricband",
      hold: 800,
    },
  ],
};
export default c;
