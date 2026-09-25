import type { TourCase } from "../types";

// Maya answers an auditor from the Evidence Explorer. She searches the ledger
// for anything involving passwords or keys (every match is BLOCK, including a
// locked archive Wrapbox could not read), then opens the card for an unknown
// program trying to upload Alex's private SSH key, and walks the
// record: who and what, what the detector found, proof it was never
// transmitted, the company rule that decided it, the Safety Kernel rules that
// back it up as a second lock, and the seal linking it to the record before
// it. Everything shown is the seeded company's own history.
const c: TourCase = {
  id: "evidence-prove",
  order: 110,
  persona: { userId: "u-maya", name: "Maya Chen", role: "Security Analyst" },
  title: "Prove what happened",
  goal: "An auditor asks Maya to prove that no passwords or keys have left the company through an AI agent.",
  outcome: "Maya shows that every record involving a password or key was blocked, and shows the auditor a sealed record proving Alex's private key never left his laptop.",
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
      body: "Each of these 20 records is sealed and linked to the one before it, like numbered pages in a bound book, so any change breaks the chain.",
    },
    {
      target: ".fsearch",
      action: "type",
      text: "credential",
      title: "Search for passwords and keys",
      body: "Maya searches for credentials, meaning passwords and keys. Four records match: three involve a key or password, one is a locked archive Wrapbox couldn't read. All four say BLOCK.",
      waitFor: ".ecard-grid",
    },
    {
      target: { selector: ".ecard.clickable-card", text: "id_rsa" },
      action: "click",
      title: "Open the private key record",
      body: "An unknown program on Alex Morgan's laptop tried to upload his private SSH key, a master key for logging in to servers, to an unknown internet address. Maya opens the record.",
      waitFor: { within: ".drawer", selector: "h2" },
    },
    {
      target: { within: ".drawer", selector: "dl.kv", text: "Device" },
      title: "Who, where and what",
      body: "The record names the person, his laptop, the unknown program that acted, the exact upload it tried, where it was headed and the kind of data inside.",
    },
    {
      target: { within: ".drawer", selector: ".ecard", text: "PRIVATE_KEY" },
      title: "What Wrapbox found inside",
      body: "Before deciding, Wrapbox's secrets detector looked at what was being sent and recognised a private key, with full confidence. The rules acted on that finding.",
    },
    {
      target: { within: ".drawer", selector: ".grid", text: "Blocked before transmission" },
      title: "Proof it never left",
      body: "The record shows what the program tried to send, and says it plainly: blocked before transmission. The unknown address never received the key.",
    },
    {
      target: { within: ".drawer", selector: ".rule-item", text: "Credentials must never" },
      title: "The company's own rule decided",
      body: "Veridian's own rule, credentials must never leave the company, matched this upload and made the call. The record names the rule and marks it: this rule decided.",
    },
    {
      target: { within: ".drawer", selector: ".grid", text: "Second lock" },
      title: "Backed up by a second lock",
      body: "Wrapbox's built-in safety rules, the Safety Kernel, are a second lock. Each would have blocked this on its own, even if Veridian had never written its rule.",
    },
    {
      target: { within: ".drawer", selector: ".row", text: "Evidence chain" },
      title: "Sealed and linked",
      body: "The first code is this record's fingerprint, the second the previous record's. Alter either record and the link breaks, so Maya can show the auditor proof, not a recollection.",
      pad: 10,
    },
  ],
};
export default c;
