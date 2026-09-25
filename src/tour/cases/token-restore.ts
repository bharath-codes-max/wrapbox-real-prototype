import type { TourCase } from "../types";

// Jordan checks who can see a customer email that Wrapbox hid from an outside AI:
// Token Vault → the round trip → restore for a requester inside Veridian
// (allowed) and for the outside AI (denied) → both attempts in the restore log.
// In this prototype "inside" and "outside" are the two requester cards on the
// page (a choice), not a live identity check — the captions say so.
const c: TourCase = {
  id: "token-restore",
  order: 80,
  persona: { userId: "u-jordan", name: "Jordan Lee", role: "Support Lead" },
  title: "Who can see a hidden email",
  goal: "Jordan's support team emails customers, so he wants to know who can see a customer's real address after Wrapbox hid it from an outside AI.",
  outcome: "He sees the same token turned back into the real email for a colleague inside Veridian, refused to the outside AI, and both attempts written to the restore log.",
  start: "control",
  poster: 6,
  steps: [
    {
      target: { selector: ".rail-item", text: "Token Vault" },
      action: "click",
      title: "Open the Token Vault",
      body: "When Wrapbox hides a customer's email from an outside AI, it swaps in a stand-in called a token — and swaps it back only for people inside the company.",
      waitFor: ".page-head",
    },
    {
      target: { selector: ".g3 > .card", text: "1 · Sent to the AI" },
      title: "The AI only saw a stand-in",
      body: "This customer's email went to an outside AI as a token, not as the real address. The real address never left Veridian.",
    },
    {
      target: { selector: ".g3 > .card", text: "2 · The AI's reply" },
      title: "The reply uses the stand-in",
      body: "The AI drafted the customer reply with the token where the email belongs. To send it, Veridian needs the real address back.",
    },
    {
      target: { selector: "button[role=tab]", text: "Who gets it back" },
      action: "click",
      title: "Two requesters, one token",
      body: "Here Jordan can try the same token for two requesters: someone inside Veridian, and the outside AI that received it.",
      waitFor: ".ecard-grid",
    },
    {
      target: { selector: ".ecard:nth-child(1) button", text: "Restore", exact: true },
      action: "click",
      title: "Ask from inside Veridian",
      body: "Restore asks Wrapbox to swap the token back for the real email. Priya Menon, inside Veridian, asks first. Wrapbox checks who is asking and whether the token is still valid.",
      waitFor: { selector: ".ecard", text: "ALLOWED" },
    },
    {
      target: ".ecard[data-tone=allow] .ecard-body",
      title: "The real email comes back",
      body: "Allowed. Priya now sees the reply with the customer's real address in her app. Here on the card it stays masked, so the real address isn't shown.",
    },
    {
      target: { selector: ".ecard:nth-child(2) button", text: "Restore", exact: true },
      action: "click",
      title: "Now the outside AI asks",
      body: "The AI that received the token asks for the real email. Wrapbox refuses: outside parties only ever hold tokens, so it keeps seeing the stand-in.",
      waitFor: { selector: ".ecard", text: "DENIED" },
      placement: "top",
    },
    {
      target: { selector: "button[role=tab]", text: "Restore log" },
      action: "click",
      title: "Both attempts are on the record",
      body: "Every request for a real value is logged, allowed or refused: who asked, when, what Wrapbox decided and why. “PII.EMAIL” means a personal email address.",
      waitFor: ".ecard-grid",
    },
  ],
};
export default c;
