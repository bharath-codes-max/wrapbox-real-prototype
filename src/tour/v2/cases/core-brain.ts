import type { TourCase } from "../../types";

// Daniel opens Core Brain to see how every decision is made. It has three tabs:
// what Wrapbox sees (the 15 facts it reads about one action), the checks (14 of
// them, in order, with the latest runs and the path of each one) and how it is
// built. He runs an action himself and watches the check that decides it light up.
const c: TourCase = {
  id: "core-brain",
  order: 115,
  persona: { userId: "u-daniel", name: "Daniel Kim", role: "Developer" },
  title: "How Wrapbox makes a decision",
  goal: "Daniel wants to see how Wrapbox decides what coding agents like Claude Code may do.",
  outcome: "Daniel saw the fifteen facts Wrapbox read about a blocked action, followed the fourteen checks to the one that decided, and ran an action himself to watch a check light up.",
  start: "control",
  poster: 6,
  steps: [
    {
      target: "button.topbar-search",
      action: "click",
      title: "Find the Core Brain",
      body: "Daniel's coding agents run under Wrapbox. To see how it decides what they may do, Daniel opens the screen search to find Core Brain.",
      say: "Okay, Daniel's coding agents, like Claude Code, run under Wrapbox, and Daniel wants to see how it decides what they're allowed to do. Daniel opens the screen search to find Core Brain.",
      waitFor: { selector: ".palette-item", text: "Core Brain" },
    },
    {
      target: { selector: ".palette-item", text: "Core Brain" },
      action: "click",
      title: "One engine for every decision",
      body: "An action on a laptop, over the network or at a company system all comes to this one engine, and every decision comes with its reasons written down.",
      say: "So, an action on a laptop, over the network or at a company system, all of it comes to this one engine, and every decision has its reasons written down.",
      waitFor: ".page-head",
    },
    {
      target: ".metricband",
      title: "The brain in three numbers",
      body: "Twenty decisions so far, fourteen checks that every action goes through, and three places Wrapbox catches actions: Device, Network and Gateway. One brain decides for all three.",
      say: "At the top, three numbers. Twenty decisions made so far, fourteen checks that every action goes through, and three places Wrapbox catches actions: the device, the network and the gateway. One brain decides for all three.",
    },
    {
      // Clicking the tab also resets a tab remembered from an earlier visit.
      target: { selector: ".tab", text: "What it sees" },
      action: "click",
      title: "First, what Wrapbox sees",
      body: "For every action Wrapbox reads fifteen facts: who is acting, what they are doing, where it goes, what data is inside and who may allow it. Pick any action on the left.",
      say: "First tab: what Wrapbox sees. For every action it reads fifteen facts: who's acting, what they're doing, where it's going, what data is inside, and who's allowed to say yes. You pick any recorded action on the left.",
      waitFor: ".din-sheet",
    },
    {
      target: { selector: ".din-item", text: "Tried to send export.json" },
      action: "click",
      title: "Open a blocked action",
      body: "Alex Morgan's agent tried to send export.json to an unknown address. Wrapbox stopped it, so this is a good one to follow.",
      say: "Let's open one that was stopped. Alex Morgan's agent tried to send a file called export dot json to an unknown address, so it's a good one to follow.",
      waitFor: { selector: ".din-head-title", text: "export.json" },
    },
    {
      target: ".din-cell.decided",
      title: "The fact that decided it",
      body: "Fifteen facts, but only one is marked “decided here”: the one that settled the answer. The others are still shown, so nothing is hidden.",
      say: "There are fifteen facts, but only one is marked decided here. That's the one that settled the answer, and the other fourteen are still shown, so nothing is hidden.",
    },
    {
      target: ".din-out",
      title: "The answer, with its reasons",
      body: "BLOCK, who decided and why, in plain words. The full record, with the evidence behind it, is one click away.",
      say: "And here's the answer: block, who decided, and why, in plain words. The full record, with the evidence behind it, is one click away.",
    },
    {
      target: { selector: ".tab", text: "The checks" },
      action: "click",
      title: "Now, the checks",
      body: "Wrapbox asks fourteen checks, always in the same order. The first one that has an answer decides; the rest are shown as nothing to object.",
      say: "Second tab: the checks. Wrapbox asks fourteen checks, always in the same order, and the first one that has an answer decides.",
      waitFor: ".chk-runs",
    },
    {
      target: ".chk-runs",
      title: "Your latest five runs",
      body: "The newest run is on top, marked Latest, with the check that decided it. Anything you run in the Simulation Lab shows up here straight away.",
      say: "Here are the latest five runs, newest on top, with the check that decided each one. Anything you run in the Simulation Lab shows up here straight away.",
    },
    {
      target: ".chk-path",
      title: "The path of one run",
      body: "Each dot is one check. The filled dot gave the answer. For this test run, no check objected, so it was allowed.",
      say: "Each dot is one check, and the filled one gave the answer. For this test run, nothing objected, so it was simply allowed.",
    },
    {
      target: { selector: ".chk-run", text: "Tried to send export.json" },
      action: "click",
      title: "Pick the blocked run",
      body: "Daniel picks the blocked export. The path moves: now it is the Safety Kernel, Wrapbox's built-in rules, that gave the answer, and no rule written by the company was needed.",
      say: "Daniel picks the blocked export, and the path moves. Now it's the Safety Kernel, Wrapbox's built-in rules, that gave the answer.",
      waitFor: { selector: ".chk-path-title", text: "export.json" },
    },
    {
      target: { selector: ".chk-card", text: "Blast radius" },
      title: "Every check has its own card",
      body: "Each card says what the check asks, what it found in the run you picked, and the latest runs it decided. Blast radius asks how much one action could break.",
      say: "Every check has its own card. It says what the check asks, what it found in the run you picked, and which runs it decided. This one, blast radius, asks how much a single action could break.",
    },
    {
      target: { within: "#chk-blast", selector: "button", text: "Run one" },
      action: "click",
      title: "Run one yourself",
      body: "Run one sends a real action through the same engine: a browser agent placing a $450 order. Nothing is faked; only the order itself is simulated.",
      say: "Now the fun part. Run one sends a real action through the same engine: a browser agent placing a four hundred and fifty dollar order. Only the order is simulated, the decision is real.",
      waitFor: { selector: ".chk-run", text: "Waiting for approval to place an order" },
    },
    {
      target: { selector: ".chk-card", text: "Blast radius" },
      title: "The card lights up",
      body: "The new run is on top, marked Latest, and Blast radius now says it decided it: the spend is above the $20 limit, so a person has to approve.",
      say: "And there it is. The new run is on top, and the blast radius card says it decided it: the spend is above the twenty dollar limit, so a person has to approve.",
    },
    {
      target: { selector: ".tab", text: "How it is built" },
      action: "click",
      title: "Last, how it is built",
      body: "Device, Network and Gateway each catch actions where they happen, and all three send them to the same engine. It answers ALLOW, CONSTRAIN, REVIEW or BLOCK.",
      say: "Last tab: how it's built. The device, the network and the gateway each catch actions where they happen, and all three send them to the same engine, which answers allow, constrain, review or block.",
      waitFor: { selector: ".section-title", text: "One brain, three arms" },
      placement: "left",
    },
  ],
};
export default c;
