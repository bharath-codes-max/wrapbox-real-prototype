import type { TourCase } from "../types";

// Sam isn't technical and doesn't know the menus. He finds things by typing:
// the search box opens a list of every screen (the palette matches screen
// names only), a few letters narrow it, one click lands him on Evidence, and
// Evidence's own search finds the one record tagged as financial data — the
// unregistered agent on Alex's finance laptop trying to send customer account
// numbers to an unknown address (EVT-00017). No other case opens this record.
const c: TourCase = {
  id: "command-palette",
  order: 120,
  persona: { userId: "u-sam", name: "Sam Rivera", role: "Finance Controller" },
  title: "Find what you need by typing",
  goal: "Sam wants to know whether any AI agent has tried to send Veridian's financial data out of the company, and he doesn't know the menus.",
  outcome: "Two short searches found the one record: customer account numbers an unvetted AI tool tried to send out, stopped before they left.",
  start: "control",
  poster: 3,
  steps: [
    {
      target: ".topbar-search",
      action: "click",
      title: "One search box on every screen",
      body: "Sam doesn't know where things live. He clicks the search box at the top, or presses ⌘K anywhere, and gets a list of every screen to jump to by name.",
      waitFor: ".palette",
    },
    {
      // Spotlight the whole palette, so the list stays visible while it narrows;
      // afterwards, the palette once only Evidence is left (typed letters + result).
      target: ".palette",
      action: "type",
      text: "evid",
      title: "Type a few letters",
      body: "The list shrinks as he types. After four letters only one screen is left: Evidence, the record of every decision Wrapbox has made.",
      waitFor: { selector: ".palette:has(.palette-item:only-child)", text: "Evidence" },
    },
    {
      target: { selector: ".palette-item", text: "Evidence" },
      action: "click",
      title: "Straight to the right screen",
      body: "One click and he's there, no menus learned. Evidence answers who did what, with which AI agent, what data was involved and what Wrapbox decided.",
      waitFor: { selector: ".page-head", text: "Evidence Explorer" },
    },
    {
      target: ".fsearch",
      action: "type",
      text: "financial",
      title: "Search in his own words",
      body: "Evidence has its own search. Sam types financial, and the 20 records narrow to one, tagged FINANCIAL.ACCOUNT: customer account numbers.",
      waitFor: { selector: ".ecard", text: "export.json" },
    },
    {
      target: { selector: ".ecard", text: "export.json" },
      action: "click",
      title: "There it is",
      body: "An AI tool nobody at Veridian registered, on Alex Morgan's finance laptop, tried to send account numbers to an unknown address. BLOCK means Wrapbox stopped it; Sam opens the record.",
      waitFor: { within: ".drawer", selector: "h2" },
    },
    {
      target: { within: ".drawer", selector: "ul", text: "Unknown high-risk external transfer" },
      title: "Stopped by an always-on rule",
      body: "The reason is written down. The Safety Kernel, Wrapbox's built-in rules that no customer can switch off, stops sensitive data going to an outside address nobody has vetted.",
      pad: 12,
    },
    {
      target: { within: ".drawer", selector: ".grid", text: "Blocked before transmission" },
      title: "His answer, without learning a menu",
      body: "Three clicks and two short searches gave Sam his answer: the file held customer account numbers, and Wrapbox stopped it before that address received anything.",
    },
  ],
};
export default c;
