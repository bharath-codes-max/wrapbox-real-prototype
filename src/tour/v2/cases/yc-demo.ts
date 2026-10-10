import type { TourCase } from "../../types";

// The YC application video (~3 minutes). The script walks the four things the
// user asked for, played against the real product:
//   1. Three places. One brain decides for Device, Network and Gateway.
//   2. Device scenario. A coding agent reaches for .env; the company's rule blocks it.
//   3. Safety Kernel + Policy Simulator. Built-in rules nobody can switch off, and a
//      preview that replays the company's own history before a rule change goes live.
//   4. Human review + Break Glass. Risky steps hold for a person, with blast radius in
//      view; a true emergency can lift the hold for one system, time-boxed, on record.
//
// Order 950 keeps it out of deck v2's slide list (CASES is filtered to order < 900).
// `kernel-install` runs so the Safety Kernel is on its new release with the preview card.
const c: TourCase = {
  id: "yc-demo",
  order: 950,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Wrapbox — runtime authorization for AI agents",
  goal: "AI agents are already acting on real systems. Wrapbox decides what they're allowed to do at the moment of action, in the real engine.",
  outcome: "One engine catches every agent action on the device, over the network and at the gateway, decides it against the company's rules and the built-in Safety Kernel, previews changes against real history, and lets a person hold or override anything with real stakes.",
  start: "brain",
  setup: ["simulate:gw-force-main"],
  poster: 2,
  steps: [
    // ─── 1 · THREE PLACES (opening): the Core Brain's "how it is built" tab. ───────
    {
      target: { selector: ".tab", text: "How it is built" },
      action: "click",
      title: "One brain. Three places.",
      body: "Wrapbox catches every agent action in one of three places: on the person's device, as it leaves the network, or at the gateway in front of each system. One decision engine behind all three.",
      say: "AI agents are acting on your systems now. Wrapbox decides, at the moment of action, what they're allowed to do. One engine, in three places: the device, the network, the gateway.",
      waitFor: { selector: ".section-title", text: "One brain, three arms" },
      hold: 1500,
    },
    {
      target: { selector: ".section-title", text: "One brain, three arms" },
      title: "Wherever it happens, same checks",
      body: "A device catches files, commands and the browser. The network catches uploads and AI destinations. The gateway catches calls to your company systems. They all send the action to the same engine, which answers ALLOW, CONSTRAIN, REVIEW or BLOCK.",
      say: "Device catches files and commands. Network catches what leaves. Gateway catches calls to your systems. All three send the action to the same engine, which answers one of four things.",
      pad: 10,
      hold: 1200,
    },

    // ─── 2 · THE CHECKS (overview, picks a real blocked action) ────────────────────
    {
      target: { selector: ".tab", text: "The checks" },
      action: "click",
      title: "Fourteen checks, in order",
      body: "Every action goes through the same fourteen checks, always in the same order. The first one that has an answer decides, and the strictest answer wins.",
      say: "Every action goes through fourteen checks, in order. The strictest wins.",
      waitFor: { selector: ".chk-runs" },
      hold: 1000,
    },
    {
      target: { selector: ".chk-run", text: "Tried to send export.json" },
      action: "click",
      title: "A real blocked action",
      body: "An agent tried to send export.json to an unknown address. Wrapbox stopped it. Each dot on the path is one check; the filled dot gave the answer.",
      say: "Here's a real one — an agent tried to send a file out. The filled dot on the path is the check that stopped it.",
      waitFor: { selector: ".chk-path-title", text: "export.json" },
      hold: 1600,
    },

    // ─── 3 · DEVICE SCENARIO: .env blocked by a company rule ──────────────────────
    {
      route: "simlab",
      target: { selector: "[role=tab]", text: "Device" },
      action: "click",
      title: "Watch the device catch one",
      body: "The Simulation Lab plays practice agent actions through Wrapbox's real checks. Nothing is faked; only the system behind the agent is simulated.",
      say: "To watch it live: the Simulation Lab plays practice actions through the same real checks.",
      waitFor: { selector: ".stream-item", text: "Agent reads .env" },
      hold: 800,
    },
    {
      target: { selector: ".stream-item", text: "Agent reads .env" },
      action: "click",
      title: "An agent reaches for the secrets file",
      body: "Daniel's coding agent is chasing a settings problem and tries to open .env, where the app keeps its passwords and keys.",
      say: "Daniel's coding agent chases a settings problem and reaches for the dot env file, where the app keeps its passwords and keys.",
      waitFor: { selector: ".card", text: "attempts to read .env" },
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "Caught, read, decided",
      body: "Wrapbox catches the command on the device, reads what the file holds right there, and decides. The company's own rule — agents must not read local secrets files — blocks it before it runs.",
      say: "Wrapbox catches it on the device, reads what the file holds right there, and decides. The company's own rule — agents must not read local secrets files — blocks it before it runs.",
      waitFor: { selector: ".aterm-line", text: "Decision BLOCK" },
      hold: 1600,
    },

    // ─── 4 · SAFETY KERNEL: built-in rules nobody can switch off ──────────────────
    {
      target: { selector: ".sidebar .nav-item", text: "Safety Kernel" },
      action: "click",
      title: "A second lock, always on",
      body: "If a company rule is missing, the Safety Kernel steps in: built-in rules nobody can switch off. Credentials never leave, mass exports stop, admin grants on production hold for a person.",
      say: "What if your rules miss something? The Safety Kernel is a second lock, always on. Built-in rules nobody can switch off, like credentials never leaving and mass exports stopping.",
      waitFor: { selector: ".page-head", text: "Safety Kernel" },
      hold: 1200,
    },
    {
      target: ".kernel-impact",
      title: "A new rule, previewed against your history",
      body: "A new rule arrives in Observe mode. Wrapbox replays it over every past action and shows what it would have changed, so nothing switches on blind.",
      say: "When a new rule ships, Wrapbox doesn't just turn it on. It replays the rule over every past action and shows what it would have changed. Nothing switches on blind.",
      hold: 1800,
    },

    // ─── 5 · POLICY SIMULATOR: preview the company's own rule change ──────────────
    {
      route: "simulator",
      target: { selector: "label.rule-item", text: "Source code may go to approved AI" },
      action: "click",
      title: "Preview a rule change, safely",
      body: "The Policy Simulator does the same for your own rules. Untick a rule — nothing lives changes — and Wrapbox replays the company's real history under the proposal.",
      say: "The Policy Simulator does the same for your own rules. Untick one — nothing live changes.",
      waitFor: { selector: ".ecard", text: "3 of 4 on in preview" },
    },
    {
      target: { selector: ".sim-col-title", text: "See what would happen" },
      title: "One past action would change",
      body: "Twenty recorded actions, two sets of rules, one difference: a review step would be lost. Nothing is recorded. Rules switch on in Intent Studio when you're sure.",
      say: "Twenty recorded actions, replayed under both rules. One review step would be lost.",
      waitFor: { selector: ".card", text: "Impact preview" },
      hold: 1600,
    },

    // ─── 6 · HUMAN REVIEW + BREAK GLASS ───────────────────────────────────────────
    {
      route: "reviews",
      target: { selector: ".ecard", text: "force-push" },
      title: "Risky steps hold for a person",
      body: "A production deploy sits in the Review Center with its blast radius in view, not with the person who asked. The requester is never the approver.",
      say: "When something risky needs a yes, it holds in the Review Center with its blast radius in view. It goes to the right person, never the one who asked.",
      waitFor: { selector: ".ecard", text: "force-push" },
      hold: 1800,
    },
    {
      route: "breakglass",
      target: ".card",
      title: "A SEV-1 can lift the hold",
      body: "In a true emergency, Break Glass lifts the hold for one system, time-boxed to twenty minutes, with a written reason. It never lifts the Safety Kernel. Every action under it is flagged in Evidence.",
      say: "A real emergency uses Break Glass: time-boxed, one system, written reason. Never lifts the Safety Kernel. Every action, on record.",
      waitFor: { selector: ".page-head", text: "Break Glass" },
      hold: 2000,
    },

    // ─── 7 · CLOSE ────────────────────────────────────────────────────────────────
    {
      route: "control",
      target: ".metricband",
      title: "Wrapbox — one brain, three places, every action on record",
      body: "Every number on every page comes from recorded actions through the real engine. Nothing on this screen is a mockup.",
      say: "That's Wrapbox. One brain, three places, every action on record.",
      waitFor: ".metricband",
      hold: 1600,
    },
  ],
};
export default c;
