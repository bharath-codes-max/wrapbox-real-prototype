import type { TourCase } from "../types";

// Priya sends a customer list to the company's approved AI. Wrapbox lets it go,
// but swaps the emails and phone numbers for tokens on the way out, and locks
// the real values in the Token Vault under their tokens.
const c: TourCase = {
  id: "pii-tokenized",
  order: 75,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Share customer data safely",
  goal: "Priya wants to see what Wrapbox does when a customer list is sent to the company's approved AI.",
  outcome: "The file went through with emails and phone numbers swapped for stand-ins, and the real values are locked in the Token Vault, where only Veridian staff can swap them back.",
  start: "simlab/network",
  poster: 6,
  steps: [
    {
      target: { selector: ".stream-item", text: "Customer PII → approved AI" },
      action: "click",
      title: "Pick an everyday moment of work",
      body: "The Simulation Lab plays everyday work against today's rules. Priya picks a customer list (PII means personal details) going to an approved AI. Predicted: CONSTRAIN, allowed but changed first.",
      waitFor: { selector: ".card", text: "Expected under the brief" },
    },
    {
      target: ".reality > div:first-child",
      title: "What she's about to send",
      body: "Priya asks the company's approved AI to draft renewal emails and attaches customers.csv. Below is the file itself: customer names, with their emails and phone numbers marked in red.",
    },
    {
      target: { selector: "button", text: "Run", exact: true },
      action: "click",
      title: "She presses Send",
      body: "Run plays Priya pressing Send in her AI chat. Before the file leaves her laptop, Wrapbox catches it to check it first.",
      waitFor: { selector: ".pipe-stage", text: "intercepts traffic" },
      hold: 2600,
    },
    {
      target: { selector: ".pipe-stage", text: "Content inspection" },
      title: "Wrapbox reads what's inside",
      body: "Wrapbox opens the file and finds three customer names, three email addresses and three phone numbers: personal details about real people.",
    },
    {
      target: { selector: ".pipe-stage", text: "Core Brain evaluation" },
      title: "Two rules match; the stricter wins",
      body: "One company rule says approved AI is fine for normal work. The other says customer emails and phones must be swapped out first. The stricter rule decides.",
    },
    {
      target: { selector: ".pipe-stage", text: "Transform applied" },
      title: "Allowed, but changed on the way",
      body: "CONSTRAIN means the file still goes, but changed first: here each email and phone number becomes a token, a harmless stand-in.",
    },
    {
      target: { selector: ".chat-bubble", text: "Delivered — protected" },
      title: "What the AI actually received",
      body: "This is what reached the AI. Names stay, so it can still write the emails; contact details arrive as tokens. The original, below, never left her laptop.",
    },
    {
      target: { selector: ".rail-item", text: "Token Vault" },
      action: "click",
      title: "Real values locked in the vault",
      body: "Wrapbox locks each real email and phone number in its Token Vault, filed under its stand-in. The AI's reply uses the stand-in, so the work goes on without the real address.",
      waitFor: { selector: ".card", text: "Sent to the AI" },
    },
    {
      target: { selector: "button", text: "Vault contents" },
      action: "click",
      title: "Every stand-in, on record",
      body: "Vault contents lists every value Wrapbox has swapped out, newest first. The six from Priya's file, three emails and three phone numbers, are now at the top.",
      waitFor: { selector: ".ecard", text: "PHONE_TOKEN_012" },
    },
    {
      target: { selector: ".ecard", text: "PII.EMAIL" },
      title: "Only Veridian can reverse it",
      body: "Each token links to the run that created it (evt-00021) and says who may swap it back: Veridian staff only, for 30 days. Even here, the address stays masked.",
    },
  ],
};
export default c;
