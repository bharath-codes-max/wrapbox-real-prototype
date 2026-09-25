import type { TourCase } from "../types";

// Maya answers an auditor from the Evidence Explorer. Maya searches the ledger
// for anything involving passwords or keys (every match is BLOCK, including a
// locked archive Wrapbox could not read, which fails closed because it could
// hide a key), then opens the card for an unidentified agent trying to upload
// Alex's private SSH key, and walks the record: who and what, what the
// detector found, proof it was never transmitted, the company rule that
// decided it, the Safety Kernel rules that back it up as a second lock, and
// the seal — computed over the decision's facts plus the previous record's
// seal. Everything shown is the seeded company's own history.
const c: TourCase = {
  id: "evidence-prove",
  order: 110,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "Prove what happened",
  goal: "An auditor asks Maya to prove that no passwords or keys have left the company through an AI agent.",
  outcome: "Maya shows that every record involving a password or key was blocked, and hands the auditor a sealed record proving Alex Morgan's private key never left the laptop.",
  start: "control",
  poster: 6,
  steps: [
    {
      target: { selector: ".rail-item", text: "Evidence" },
      action: "click",
      title: "Open the Evidence Explorer",
      body: "An auditor wants proof that no passwords or keys have left the company through an AI agent. Maya opens Evidence, where every Wrapbox decision is recorded.",
      waitFor: { selector: ".overview-card", text: "Tamper-evident ledger" },
    },
    {
      target: { selector: ".overview-card", text: "Tamper-evident ledger" },
      title: "A record nobody can quietly edit",
      body: "All 20 records are sealed and chained in order, like pages in a bound book: change one and the chain breaks. Sealing is simulated in this demo.",
    },
    {
      target: ".fsearch",
      action: "type",
      text: "credential",
      title: "Search for passwords and keys",
      body: "Four matches, all BLOCK: stopped. One is a locked zip that could hide a key.",
      waitFor: ".ecard-grid",
    },
    {
      target: { selector: ".ecard.clickable-card", text: "id_rsa" },
      action: "click",
      title: "Open the private key record",
      body: "An unidentified agent on Alex Morgan's laptop tried to send Alex's private SSH key, a key for logging in to servers, to an unknown address. Maya opens it.",
      waitFor: { within: ".drawer", selector: "h2" },
    },
    {
      target: { within: ".drawer", selector: "dl.kv", text: "Device" },
      title: "Who, where and what",
      body: "The record names Alex Morgan, the laptop, the unidentified agent, the exact upload it tried, where it was headed and the kind of data inside.",
    },
    {
      target: { within: ".drawer", selector: ".ecard", text: "PRIVATE_KEY" },
      title: "What Wrapbox found inside",
      body: "Before deciding, Wrapbox's secrets detector read what was being sent and recognised a private key, with full confidence. The rules then acted on that finding.",
    },
    {
      target: { within: ".drawer", selector: ".grid", text: "Blocked before transmission" },
      title: "Proof it never left",
      body: "The record shows what the agent tried to send and states plainly: blocked before transmission. The unknown address never received the key.",
    },
    {
      target: { within: ".drawer", selector: ".rule-item", text: "Credentials must never" },
      title: "The company's own rule decided",
      body: "Veridian's own rule, “Credentials must never be transmitted externally”, matched this upload and made the call. The record names the rule and marks it: this rule decided.",
    },
    {
      target: { within: ".drawer", selector: ".grid", text: "Second lock" },
      title: "Backed up by a second lock",
      body: "Wrapbox's built-in safety rules, the Safety Kernel, are a second lock. Each one shown would have blocked this on its own, even without Veridian's rule.",
    },
    {
      target: { within: ".drawer", selector: ".row", text: "Evidence chain" },
      title: "Sealed proof, not a recollection",
      body: "The first code seals this record's facts, from who and what to the decision; the second is the previous record's seal. Change any fact and it stops matching.",
      pad: 10,
    },
  ],
};
export default c;
