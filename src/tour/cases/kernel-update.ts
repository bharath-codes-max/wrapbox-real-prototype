import type { TourCase } from "../types";

// Priya installs a Safety Kernel update: read the notes and the impact on her
// own history, install (the new rule starts in observe mode), then enforce.
const c: TourCase = {
  id: "kernel-update",
  order: 45,
  persona: { userId: "u-priya", name: "Priya Menon", role: "Admin" },
  title: "Install a safety update",
  goal: "Wrapbox has shipped a new built-in safety rule, and Priya wants it on without breaking anyone's work.",
  outcome: "The new rule is installed and blocking, after she saw exactly what it would have changed in her company's own history.",
  start: "control",
  poster: 5,
  steps: [
    {
      target: ".subbar",
      title: "A safety update has arrived",
      body: "The Safety Kernel is Wrapbox's own set of always-on rules. This bar says version 2026.09.2 is out, adding one new rule.",
    },
    {
      target: { selector: ".subbar button", text: "Review & install" },
      action: "click",
      title: "Read before installing",
      body: "Nothing installs by itself. Priya opens the update to see what it would change first.",
      waitFor: ".card.kernel-update",
    },
    {
      target: ".card.kernel-update ul",
      title: "What the new rule does",
      body: "A force-push can overwrite a team's shared code history in one command. The rule blocks that on production branches, the code customers rely on, and the notes name a safer route.",
    },
    {
      target: ".kernel-impact",
      title: "Checked against her own history",
      body: "Wrapbox replays the new rule over everything already recorded here. One past force-push, which had waited for a person's approval, would have been blocked outright.",
    },
    {
      target: { selector: ".card.kernel-update button", text: "Install update" },
      action: "click",
      title: "Install it",
      body: "Priya installs the update. The new rule joins the built-in list, and the six rules already there carry on exactly as before.",
      placement: "bottom",
      waitFor: { selector: ".ecard", text: "Protected history rewrite" },
    },
    {
      target: { selector: ".ecard", text: "Protected history rewrite" },
      title: "It starts by only watching",
      body: "OBSERVING means the rule only notes what it would have blocked, counting from today; it stops nothing yet. On the date shown, a week away, it starts blocking by itself.",
    },
    {
      target: { selector: ".ecard button", text: "Start enforcing now" },
      action: "click",
      title: "Or switch it on today",
      body: "She has already seen its effect on her own history, so she skips the week-long wait. The card turns to ENFORCING: the rule now blocks.",
      waitFor: { selector: ".ecard", text: "Protected history rewrite" },
    },
    {
      target: { selector: ".card.kernel-banner" },
      title: "Installed and protecting",
      body: "The kernel now reads Up to date: seven built-in rules, all seven enforcing, none on trial. From here on, a force-push over a production branch is blocked.",
    },
  ],
};
export default c;
