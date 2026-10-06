// The scanners Core Brain → "Data it can find" runs when you test text. These are real:
// they read the text you give them and report what they match. Recorded runs from the
// Simulation Lab do NOT use them — each scenario carries findings written by hand — so
// SCANNER_INFO says, per scanner, which of the two it is.
//
// Nothing here returns or logs a raw secret: every match is masked before it leaves.
import type { ScenarioFinding } from "./scenarios";
import type { Decision, IntentContract } from "../model/types";
import { DETECTORS } from "../model/registries";

export interface Hit {
  dataClass: string;
  detector: string;
  start: number;
  end: number;
  /** Masked — never the raw value. */
  shown: string;
  confidence: number;
  /** One sentence: why this is a match. */
  why: string;
}
export interface Ignored { detector: string; shown: string; reason: string }
export interface ScanResult { hits: Hit[]; ignored: Ignored[] }

// ── helpers ──────────────────────────────────────────────────────────────────
export function entropy(s: string): number {
  if (!s) return 0;
  const n = new Map<string, number>();
  for (const c of s) n.set(c, (n.get(c) ?? 0) + 1);
  let h = 0;
  for (const v of n.values()) { const p = v / s.length; h -= p * Math.log2(p); }
  return h;
}
const mask = (s: string, head = 4, tail = 2) => (s.length <= head + tail + 2 ? "•".repeat(s.length) : `${s.slice(0, head)}•••${s.slice(-tail)}`);
export function luhn(digits: string): boolean {
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return digits.length > 0 && sum % 10 === 0;
}
const brandOf = (d: string): string | null => {
  const n2 = +d.slice(0, 2), n4 = +d.slice(0, 4), n3 = +d.slice(0, 3);
  if (d[0] === "4" && [13, 16, 19].includes(d.length)) return "Visa";
  if (((n2 >= 51 && n2 <= 55) || (n4 >= 2221 && n4 <= 2720)) && d.length === 16) return "Mastercard";
  if ((n2 === 34 || n2 === 37) && d.length === 15) return "Amex";
  if ((n4 === 6011 || n2 === 65 || (n3 >= 644 && n3 <= 649)) && d.length === 16) return "Discover";
  return null;
};
const PLACEHOLDER = /^(?:changeme|change_me|password|secret|example|sample|dummy|test|todo|null|none|undefined|true|false|your[-_ ].*|<.*>|\$\{.*\}|\{\{.*\}\}|\$[A-Z_]+|x{3,}|\*{3,}|•{3,}|\.{3,})$/i;
const overlaps = (hits: { start: number; end: number }[], s: number, e: number) => hits.some((h) => s < h.end && e > h.start);

// ── registered data for exact-match (a sample of what a customer would upload, hashed) ──
export const EDM_REGISTERED: { value: string; dataClass: "CUSTOM.CUSTOMER_ID" | "FINANCIAL.ACCOUNT" }[] = [
  { value: "VRD-CUST-0921", dataClass: "CUSTOM.CUSTOMER_ID" },
  { value: "VRD-CUST-0922", dataClass: "CUSTOM.CUSTOMER_ID" },
  { value: "VRD-CUST-1147", dataClass: "CUSTOM.CUSTOMER_ID" },
  { value: "VRD-CUST-1407", dataClass: "CUSTOM.CUSTOMER_ID" },
  { value: "ACCT-99128842", dataClass: "FINANCIAL.ACCOUNT" },
  { value: "ACCT-99310027", dataClass: "FINANCIAL.ACCOUNT" },
  { value: "ACCT-00008842", dataClass: "FINANCIAL.ACCOUNT" },
  { value: "ACCT-00003117", dataClass: "FINANCIAL.ACCOUNT" },
];

// ── the scanners ─────────────────────────────────────────────────────────────
interface SecretRule { re: RegExp; cls: string; label: string; minEntropy: number; bodyFrom: number }
const SECRET_RULES: SecretRule[] = [
  { re: /\b[sr]k_(?:live|test)_[0-9A-Za-z]{20,}\b/g, cls: "CREDENTIAL.API_KEY", label: "Stripe key", minEntropy: 3.2, bodyFrom: 8 },
  { re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, cls: "CREDENTIAL.API_KEY", label: "AWS access key", minEntropy: 3.0, bodyFrom: 4 },
  { re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, cls: "CREDENTIAL.API_KEY", label: "GitHub token", minEntropy: 3.5, bodyFrom: 4 },
  { re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, cls: "CREDENTIAL.API_KEY", label: "Slack token", minEntropy: 3.0, bodyFrom: 5 },
  { re: /\bAIza[0-9A-Za-z_-]{35}\b/g, cls: "CREDENTIAL.API_KEY", label: "Google API key", minEntropy: 3.5, bodyFrom: 4 },
  { re: /\bsk-[A-Za-z0-9_-]{32,}\b/g, cls: "CREDENTIAL.API_KEY", label: "AI provider key", minEntropy: 3.5, bodyFrom: 3 },
];
const PRIVATE_KEY = /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY(?: BLOCK)?-----/g;
const ASSIGNMENT = /\b([A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|api[_-]?key|apikey|token|auth)[A-Za-z0-9_.-]*)\s*[:=]\s*(["']?)([^\s"'`,;]{6,})\2/gi;

function scanSecrets(text: string, out: ScanResult) {
  const det = "secrets-v2";
  for (const m of text.matchAll(PRIVATE_KEY)) {
    out.hits.push({ dataClass: "CREDENTIAL.PRIVATE_KEY", detector: det, start: m.index!, end: m.index! + m[0].length, shown: m[0], confidence: 0.99, why: "A private-key header. Real private keys always start with this line." });
  }
  for (const r of SECRET_RULES) {
    for (const m of text.matchAll(r.re)) {
      const raw = m[0], s = m.index!, e = s + raw.length;
      const body = raw.slice(r.bodyFrom);
      if (/example/i.test(raw) || entropy(body) < r.minEntropy) {
        out.ignored.push({ detector: det, shown: mask(raw), reason: `Looks like a ${r.label} but the characters are too regular to be real (a placeholder or example).` });
        continue;
      }
      out.hits.push({ dataClass: r.cls, detector: det, start: s, end: e, shown: mask(raw), confidence: 0.97, why: `${r.label} format, and the characters are random enough to be real.` });
    }
  }
  for (const m of text.matchAll(ASSIGNMENT)) {
    const name = m[1], value = m[3], s = m.index! + m[0].lastIndexOf(value), e = s + value.length;
    if (overlaps(out.hits, s, e)) continue;
    if (PLACEHOLDER.test(value) || /^(?:process\.env|os\.environ|env\.|getenv)/i.test(value) || new Set(value).size <= 2) {
      out.ignored.push({ detector: det, shown: `${name}=${mask(value, 1, 0)}`, reason: "Named like a secret, but the value is a placeholder or points to an environment variable." });
      continue;
    }
    if (entropy(value) < 2.2 && !(/[A-Za-z]/.test(value) && /\d/.test(value))) {
      out.ignored.push({ detector: det, shown: `${name}=${mask(value, 1, 0)}`, reason: "Named like a secret, but the value is too simple to tell." });
      continue;
    }
    const isKey = /key|token|auth|secret/i.test(name) && !/pass/i.test(name);
    out.hits.push({ dataClass: isKey ? "CREDENTIAL.API_KEY" : "CREDENTIAL.PASSWORD", detector: det, start: s, end: e, shown: `${name}=${mask(value, 1, 1)}`, confidence: 0.8, why: `"${name}" is named like a ${isKey ? "key" : "password"} and is set to a real-looking value.` });
  }
}

function scanCards(text: string, out: ScanResult) {
  for (const m of text.matchAll(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g)) {
    const digits = m[0].replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) continue;
    const brand = brandOf(digits);
    if (!brand || !luhn(digits)) continue;
    out.hits.push({ dataClass: "PCI.CARD", detector: "pci-card-v1", start: m.index!, end: m.index! + m[0].length, shown: `•••• •••• •••• ${digits.slice(-4)}`, confidence: 0.99, why: `${brand} number: right length, right starting digits, and the check digit adds up (Luhn).` });
  }
}

function scanSsn(text: string, out: ScanResult) {
  const ok = (a: string, g: string, s: string) => a !== "000" && a !== "666" && +a < 900 && g !== "00" && s !== "0000";
  for (const m of text.matchAll(/(?<![\d-])(\d{3})-(\d{2})-(\d{4})(?![\d-])/g)) {
    if (!ok(m[1], m[2], m[3]) || overlaps(out.hits, m.index!, m.index! + m[0].length)) continue;
    out.hits.push({ dataClass: "PII.SSN", detector: "gov-id-v1", start: m.index!, end: m.index! + m[0].length, shown: `***-**-${m[3]}`, confidence: 0.95, why: "In SSN format, and the area, group and serial numbers are ones the SSA actually issues." });
  }
  for (const m of text.matchAll(/(?:ssn|social security(?: number)?)\D{0,12}(\d{9})(?!\d)/gi)) {
    const d = m[1], s = m.index! + m[0].length - 9;
    if (!ok(d.slice(0, 3), d.slice(3, 5), d.slice(5)) || overlaps(out.hits, s, s + 9)) continue;
    out.hits.push({ dataClass: "PII.SSN", detector: "gov-id-v1", start: s, end: s + 9, shown: `*****${d.slice(5)}`, confidence: 0.9, why: "Nine digits, written right after the words SSN or social security." });
  }
}

function scanEmail(text: string, out: ScanResult) {
  for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g)) {
    const [local, domain] = m[0].split("@");
    out.hits.push({ dataClass: "PII.EMAIL", detector: "pii-email-v2", start: m.index!, end: m.index! + m[0].length, shown: `${local[0]}•••${local.length > 1 ? local.slice(-1) : ""}@${domain}`, confidence: 0.99, why: "Name, @, then a domain with a valid ending." });
  }
}

function scanPhone(text: string, out: ScanResult) {
  const nanp = /(?<![\w.])(?:\+?1[\s.-]?)?(\(\d{3}\)|\d{3})[\s.-]?(\d{3})[\s.-]?(\d{4})(?![\w])/g;
  for (const m of text.matchAll(nanp)) {
    const area = m[1].replace(/\D/g, ""), ex = m[2];
    const raw = m[0], s = m.index!;
    if (/^\d+$/.test(raw) || area[0] < "2" || ex[0] < "2" || overlaps(out.hits, s, s + raw.length)) continue;
    out.hits.push({ dataClass: "PII.PHONE", detector: "pii-phone-v2", start: s, end: s + raw.length, shown: `${raw.slice(0, 5)}••• ••${raw.slice(-2)}`, confidence: 0.9, why: "US/Canada format: valid area code and exchange, with separators." });
  }
  for (const m of text.matchAll(/(?<![\w.])\+(?!1[\s.-])\d{1,3}[\s.-]\d[\d\s.-]{6,12}\d(?![\w])/g)) {
    const n = m[0].replace(/\D/g, "").length;
    if (n < 8 || n > 15 || overlaps(out.hits, m.index!, m.index! + m[0].length)) continue;
    out.hits.push({ dataClass: "PII.PHONE", detector: "pii-phone-v2", start: m.index!, end: m.index! + m[0].length, shown: `${m[0].slice(0, 4)}••• ••${m[0].slice(-2)}`, confidence: 0.85, why: "International format: + country code, then 8 to 15 digits in total." });
  }
}

function scanCode(text: string, out: ScanResult) {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 1) return;
  const signals: [string, RegExp][] = [
    ["import", /^\s*(?:import\s.+from\s+['"]|import\s+[\w.]+;?\s*$|from\s+[\w.]+\s+import\s)/m],
    ["export", /^\s*export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|interface|type)\b/m],
    ["declaration", /\b(?:function|const|let|var)\s+\w+\s*(?:=|\()/],
    ["types", /\b\w+\s*:\s*[A-Z]\w*(?:<[^>]*>)?\s*[,)=;{]/],
    ["arrow", /=>\s*[{(]/],
    ["def/class", /^\s*(?:def|class)\s+\w+.*:\s*$/m],
    ["include", /#include\s*[<"]/],
    ["java", /\bpublic\s+(?:static\s+)?(?:class|void|int|String)\b/],
    ["go/rust", /\b(?:func|fn)\s+\w+\s*\(/],
    ["control", /\b(?:if|for|while)\s*\(.+\)\s*\{/],
    ["return", /\breturn\b[^\n]*[;)}]\s*$/m],
    ["blocks", /[{};]\s*$/m],
    ["calls", /\b[\w$]+(?:\.[\w$]+)+\([^)]*\)/],
  ];
  const seen = signals.filter(([, re]) => re.test(text)).map(([n]) => n);
  if (seen.length < 3) return;
  const lang = seen.includes("def/class") ? "Python" : seen.includes("include") ? "C/C++" : seen.includes("java") ? "Java" : seen.includes("go/rust") ? "Go or Rust" : "JavaScript / TypeScript";
  out.hits.push({ dataClass: "SOURCE_CODE", detector: "code-detect-v1", start: 0, end: text.length, shown: `${lang}-style code, ${lines.length} line${lines.length === 1 ? "" : "s"}`, confidence: Math.min(0.95, 0.5 + seen.length * 0.08), why: `${seen.length} code signs found together (${seen.join(", ")}). Plain writing does not have these.` });
}

function scanExact(text: string, out: ScanResult) {
  for (const r of EDM_REGISTERED) {
    let i = text.indexOf(r.value);
    while (i !== -1) {
      out.hits.push({ dataClass: r.dataClass, detector: "edm-financial-v1", start: i, end: i + r.value.length, shown: `${r.value.slice(0, r.value.lastIndexOf("-") + 1)}••••`, confidence: 1, why: "Exact match with a value in your registered data set." });
      i = text.indexOf(r.value, i + r.value.length);
    }
  }
}

/** Run every scanner this prototype can really run over `text`. */
export function scanText(text: string): ScanResult {
  const out: ScanResult = { hits: [], ignored: [] };
  scanSecrets(text, out);
  scanCards(text, out);
  scanSsn(text, out);
  scanPhone(text, out);
  scanEmail(text, out);
  scanExact(text, out);
  scanCode(text, out);
  out.hits.sort((a, b) => a.start - b.start);
  return out;
}

/** The engine's finding shape: one row per data type, with a masked sample. */
export function toFindings(hits: Hit[]): ScenarioFinding[] {
  const by = new Map<string, ScenarioFinding>();
  for (const h of hits) {
    const f = by.get(h.dataClass);
    if (f) f.count++; else by.set(h.dataClass, { dataClass: h.dataClass, count: 1, sample: h.shown });
  }
  return [...by.values()];
}

// ── what each scanner is, in plain words ─────────────────────────────────────
export interface ScannerInfo {
  title: string;
  finds: string;
  /** Can this prototype really run it on text you paste? */
  testable: boolean;
  /** What the prototype runs, or why it cannot. */
  here: string;
  /** What a production build would use. */
  production: string;
}
export const SCANNER_INFO: Record<string, ScannerInfo> = {
  "pii-email-v2": { title: "Email addresses", finds: "alice@example.com", testable: true, here: "Pattern match on name, @ and domain.", production: "Pattern match plus context rules." },
  "pii-phone-v2": { title: "Phone numbers", finds: "+1 415 555 0100", testable: true, here: "Pattern match with valid US area codes and international length rules.", production: "A phone-number library with per-country rules." },
  "ner-person-v1": { title: "People's names", finds: "Alice Johnson", testable: false, here: "Needs a trained language model. The prototype cannot run one, so only Simulation Lab runs show names.", production: "A named-entity model." },
  "gov-id-v1": { title: "Government ID numbers (SSN)", finds: "123-45-6789", testable: true, here: "Pattern match, then the SSA's rules for which numbers are ever issued.", production: "Pattern match plus checksum rules per country." },
  "secrets-v2": { title: "Passwords and API keys", finds: "sk_live_…, AKIA…, DB_PASSWORD=…", testable: true, here: "Known key formats plus a randomness check, and secret-named settings with real-looking values. Placeholders are ignored.", production: "A maintained rule set of key formats plus a randomness check." },
  "code-detect-v1": { title: "Source code", finds: "checkout.ts", testable: true, here: "Counts code signs that appear together (imports, functions, braces).", production: "A parser that reads the code's structure (tree-sitter)." },
  "edm-financial-v1": { title: "Your own customer and account data", finds: "VRD-CUST-0921", testable: true, here: "Exact match against a small sample list of registered values.", production: "Exact match against your uploaded customer and account lists, stored as hashes." },
  "pci-card-v1": { title: "Payment card numbers", finds: "4111 1111 1111 1111", testable: true, here: "Length, starting digits and the Luhn check digit.", production: "The same checks, plus context." },
  "phi-semantic-v1": { title: "Health information", finds: "Discharge summary", testable: false, here: "Needs a trained classifier. Not run in the prototype.", production: "A trained classifier." },
  "label-mip-v1": { title: "Labelled documents (legal, pay)", finds: "A file labelled Privileged", testable: false, here: "Reads a label stored on a file, so pasted text has none to read.", production: "Reads Microsoft sensitivity labels on the file." },
  "semantic-company-v1": { title: "Company secrets (roadmap, pricing)", finds: "FY27 roadmap", testable: false, here: "Needs a trained classifier. Not run in the prototype.", production: "A trained classifier." },
  "ocr-vision-v1": { title: "Text inside images", finds: "A screenshot of a record", testable: false, here: "Needs image reading. Not run in the prototype.", production: "OCR, then the other scanners on the text it reads." },
};

// ── which of your rules act on a scanner's data ──────────────────────────────
export interface RuleUse { contract: string; clause: string; effect: Decision }
/** Active rules with a clause that names any data type this scanner finds. */
export function rulesUsing(detectorId: string, contracts: IntentContract[]): RuleUse[] {
  const classes = DETECTORS.find((d) => d.id === detectorId)?.detects ?? [];
  const out: RuleUse[] = [];
  for (const c of contracts) {
    if (c.status !== "ACTIVE") continue;
    for (const cl of c.clauses) if (cl.dataClasses.some((d) => classes.includes(d))) out.push({ contract: c.name, clause: cl.text, effect: cl.effect });
  }
  return out;
}
