// ============================================================================
// Task drafter — deterministic natural-language → TaskJobDraft extractor, the
// Tasks equivalent of Intent Studio's draftClauses(). Pattern-driven and
// predictable (a simulated compiler, same as the intent drafter); a real
// product would compile through the same Policy IR. Never fabricates a value
// it didn't find in the text — a field the text doesn't mention is left out of
// the result, so Create Task only overwrites what was actually said.
// ============================================================================

import { AGENTS, USERS, RESOURCES } from "../model/org";
import type { ActionVerb, Environment } from "../model/types";
import { TASK_TEAMS, TASK_SENSITIVITIES, TASK_STEP_ACTIONS, type TaskJobDraft, type TaskStepDraft } from "../state/store";

export interface DraftedTask {
  patch: Partial<Omit<TaskJobDraft, "steps">>;
  steps: TaskStepDraft[];
  /** Plain-word notes on anything the text implied but the drafter couldn't
   *  resolve to a real agent, person or resource — shown under the preview so
   *  nothing is silently dropped. */
  unresolved: string[];
}

const ENVIRONMENTS: Environment[] = ["production", "staging", "development", "test", "local"];
const NEGATED_NEAR = /\b(never|must not|may not|cannot|can't|not allowed to|forbidden|no access to|don't|shouldn't)\b[^.]{0,40}$/i;

const ACTION_WORDS: [RegExp, ActionVerb][] = [
  [/\b(deploy|ship|release|roll ?out)\b/i, "DEPLOY"],
  [/\b(delete|remove|clean ?up|purge|drop)\b/i, "DELETE"],
  [/\b(export|download|pull a copy|extract)\b/i, "DATA_EXPORT"],
  [/\b(send|email|upload|share|post|notify)\b/i, "NETWORK_SEND"],
  [/\b(run|execute|test|verify|check)\b/i, "EXECUTE"],
  [/\b(write|edit|patch|update|fix|commit|change|modify)\b/i, "WRITE"],
  [/\b(read|review|look at|check|open|inspect)\b/i, "READ"],
];
const SENSITIVITY_WORDS: [RegExp, (typeof TASK_SENSITIVITIES)[number]][] = [
  [/\bcustomer|production|live\b/i, "customer-impacting"],
  [/\bsensitive|confidential|private\b/i, "sensitive"],
  [/\btemp|scratch|disposable|throwaway\b/i, "disposable"],
];

function findPerson(text: string, exclude?: string): string | undefined {
  const hit = USERS.find((u) => u.id !== exclude && new RegExp(`\\b${u.name.split(" ")[0]}\\b`, "i").test(text));
  return hit?.id;
}
function findAgent(text: string): string | undefined {
  const hit = AGENTS.filter((a) => !a.discovered).find((a) => text.toLowerCase().includes(a.name.toLowerCase()));
  return hit?.id;
}
/** A resource mentioned by name/id, or a bare path-like token (src/, CHANGELOG.md, .env). */
function findResources(text: string): string[] {
  const out = new Set<string>();
  for (const r of RESOURCES) if (text.toLowerCase().includes(r.name.toLowerCase()) || text.toLowerCase().includes(r.id)) out.add(r.id);
  for (const m of text.matchAll(/\b[\w-]+\/[\w./-]*|\b[\w-]+\.(?:ts|js|json|md|yaml|yml|env|csv)\b|\.env\b/gi)) out.add(m[0]);
  return [...out];
}

/** Reads a short setup paragraph (title, who's asking, who approves, scope, forbidden,
 *  time, budget) followed by the steps — one sentence or numbered line per step, in
 *  order. Nothing here is an LLM call; it's regex and word lists, same honesty as
 *  engine/drafter.ts. A production build would route this through the real Policy IR. */
export function draftTask(text: string): DraftedTask {
  const unresolved: string[] = [];
  const patch: Partial<Omit<TaskJobDraft, "steps">> = {};

  // Title: an explicit "Title: …" line, else the first sentence.
  const titleLine = text.match(/title\s*:\s*(.+)/i);
  const firstSentence = text.split(/[.\n]/)[0]?.trim();
  if (titleLine) patch.title = titleLine[1].trim();
  else if (firstSentence && firstSentence.length < 90) patch.title = firstSentence;

  const team = TASK_TEAMS.find((t) => new RegExp(`\\b${t}\\b`, "i").test(text));
  if (team) patch.team = team;

  const agent = findAgent(text);
  if (agent) patch.agent = agent; else if (/\bagent\b/i.test(text)) unresolved.push("Which agent does this? Name one on the Build tab.");

  // "asks" / "requested by" names the asker; "approve(s)", "sign-off", "goes to" names the approver.
  const askerMatch = text.match(/\b([A-Z][a-z]+)\s+(?:asks|wants|requests|needs)\b/) ?? text.match(/requested by\s+([A-Z][a-z]+)/i);
  const approverMatch = text.match(/approv(?:es?|ed by)\s+([A-Z][a-z]+)/i) ?? text.match(/sign-?off from\s+([A-Z][a-z]+)/i) ?? text.match(/goes to\s+([A-Z][a-z]+)\b/i);
  const asker = askerMatch ? findPerson(askerMatch[1]) ?? findPerson(text) : findPerson(text);
  if (asker) patch.user = asker;
  const approver = approverMatch ? findPerson(approverMatch[1], asker) : findPerson(text, asker);
  if (approver && approver !== asker) patch.approver = approver;
  else if (/\bapprov|sign-?off\b/i.test(text)) unresolved.push("Who approves the risky step? Name someone other than the asker on the Build tab.");

  const env = ENVIRONMENTS.find((e) => new RegExp(`\\bin ${e}\\b|\\bhome environment\\b[^.]*\\b${e}\\b`, "i").test(text));
  if (env) patch.environment = env;

  const durMatch = text.match(/(\d+)\s*(hours?|hrs?)\b/i) ?? text.match(/(\d+)\s*(minutes?|mins?)\b/i);
  if (durMatch) patch.durationMin = /h/i.test(durMatch[2]) ? Number(durMatch[1]) * 60 : Number(durMatch[1]);
  const budgetMatch = text.match(/(\d+)\s*files?\b/i);
  if (budgetMatch) patch.fileBudget = Number(budgetMatch[1]);

  // Forbidden: anything named right after a negation word; "production" always
  // counts if the text forbids it anywhere, even outside the 40-char window.
  const forbidden = new Set<string>();
  for (const m of text.matchAll(/(?:never|must not|may not|cannot|can't|not allowed to|forbidden(?: to touch)?|no access to|don't|shouldn't)\s+(?:touch|access|go to|reach)?\s*([a-zA-Z0-9_./-]+)/gi)) {
    forbidden.add(m[1].replace(/[.,]$/, ""));
  }
  if (/\bnever\b[^.]*\bproduction\b|\bproduction\b[^.]*\bforbidden\b|\bmust not\b[^.]*\bproduction\b/i.test(text)) forbidden.add("production");
  if (forbidden.size) patch.forbidden = [...forbidden];

  // Allowed scope: resources mentioned that are NOT also named as forbidden.
  const resources = findResources(text).filter((r) => ![...forbidden].some((f) => r.toLowerCase().includes(f.toLowerCase())));
  if (resources.length) patch.allowedResources = resources;

  const actions = new Set<ActionVerb>();
  for (const [re, verb] of ACTION_WORDS) if (re.test(text)) actions.add(verb);
  if (actions.size) patch.allowedActions = [...actions];

  // Steps: numbered/bulleted lines win if present; otherwise each remaining
  // sentence (after the setup ones already consumed above) becomes one step,
  // in the order it was written — the natural reading of a plan.
  const numbered = [...text.matchAll(/(?:^|\n)\s*(?:\d+[.)]|step\s*\d+\s*[:.]?|[-*])\s*(.+)/gi)].map((m) => m[1].trim());
  const sentences = numbered.length >= 2 ? numbered : text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 6);
  const stepSentences = numbered.length >= 2 ? sentences : sentences.slice(1); // drop the title sentence when falling back to prose

  const steps: TaskStepDraft[] = [];
  stepSentences.forEach((raw, i) => {
    const s = raw.replace(/[.]+$/, "");
    if (/^(title|asked by|approved by)\s*:/i.test(s)) return; // a setup line, not a step
    const actionHit = ACTION_WORDS.find(([re]) => re.test(s));
    const action: ActionVerb = actionHit?.[1] ?? "EXECUTE";
    const resHit = findResources(s)[0] ?? patch.allowedResources?.find((r) => s.toLowerCase().includes(r.toLowerCase()));
    if (!resHit) unresolved.push(`Step "${s.length > 48 ? s.slice(0, 45) + "…" : s}" — no resource found; fill it in on the Build tab.`);
    const envHit = ENVIRONMENTS.find((e) => new RegExp(`\\b${e}\\b`, "i").test(s)) ?? patch.environment ?? "development";
    const sensHit = SENSITIVITY_WORDS.find(([re]) => re.test(s))?.[1] ?? "internal";
    steps.push({
      label: s.charAt(0).toUpperCase() + s.slice(1),
      action: TASK_STEP_ACTIONS.includes(action) ? action : "EXECUTE",
      resource: resHit ?? "",
      environment: envHit,
      sensitivity: sensHit,
      dependsOn: i > 0 ? [i - 1] : [], // read as a plan: each step follows the one before it
    });
  });

  return { patch, steps, unresolved };
}
