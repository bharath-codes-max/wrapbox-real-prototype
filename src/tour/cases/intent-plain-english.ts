import type { TourCase } from "../types";

// Reference case: Priya writes a company rule in her own words.
// Priya is the persona the product records as author on Save as draft, and the header avatar.
const c: TourCase = {
  id: "intent-plain-english",
  order: 30,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Write a rule in plain English",
  goal: "Priya wants customer emails and phone numbers disguised before they are sent outside the company.",
  outcome: "Her own sentence became a rule Wrapbox can check, saved as a draft that changes nothing until someone switches it on.",
  start: "intent",
  poster: 4,
  steps: [
    {
      target: { selector: "button", text: "Draft contract" },
      action: "click",
      title: "Start a new rule",
      body: "In Wrapbox, a written company rule is called a contract. Priya opens the drafter to write a new one.",
      waitFor: { within: ".drawer", selector: ".field", nth: 0 },
    },
    {
      target: ".drawer input.input",
      action: "type",
      text: "Protect customer contact details",
      title: "Give it a clear name",
      body: "A plain name, so anyone on the team can recognise the rule later.",
    },
    {
      target: ".drawer textarea",
      action: "type",
      text: "Customer email addresses and phone numbers must be tokenized before they are sent anywhere outside the company.",
      title: "Say it the way you'd say it",
      body: "Priya types the rule the way she'd tell a colleague. 'Tokenized' just means each email or phone number is swapped for a harmless stand-in.",
    },
    {
      target: { within: ".drawer", selector: "button", text: "Compile" },
      action: "click",
      title: "Turn the sentence into a rule",
      body: "Wrapbox reads her sentence and works out which data it protects and what must happen to it.",
      waitFor: { within: ".drawer", selector: ".card", nth: 0 },
    },
    {
      target: { within: ".drawer", selector: ".card", nth: 0 },
      title: "Check what Wrapbox understood",
      body: "CONSTRAIN: the message still goes, but emails and phone numbers are swapped for stand-ins. Fail closed: if Wrapbox can't read what's being sent, it blocks it.",
    },
    {
      target: { within: ".drawer", selector: ".row", text: "Coverage rollup" },
      title: "It only promises what it can keep",
      body: "ENFORCED means Wrapbox has the live skill to check this today. If a needed skill were missing, it would say so and refuse to switch the rule on.",
      pad: 10,
    },
    {
      target: { within: ".drawer", selector: "button", text: "Save as draft" },
      action: "click",
      title: "Saved, but not switched on",
      body: "The new rule joins the team's list as a DRAFT. Nothing changes for anyone until someone turns it on.",
      waitFor: { selector: ".ecard", text: "Protect customer contact details" },
    },
    {
      target: { selector: ".ecard", text: "Protect customer contact details" },
      action: "click",
      title: "The finished rule, spelled out",
      body: "Opened, the draft lists where it applies — AI tools, outside websites, unknown destinations and partners — and the live skill that checks it. It stays off until someone presses Activate.",
      waitFor: { within: ".drawer", selector: ".card", text: "requires" },
      // Wide enough to take in the Activate / Simulate impact row under the clause card.
      pad: 46,
    },
  ],
};
export default c;
