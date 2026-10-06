// Core Brain → Data it can find: the scanners are real, so test them like scanners.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scanText, toFindings, luhn, entropy, rulesUsing, SCANNER_INFO } from "../src/engine/detect";
import { DETECTORS } from "../src/model/registries";
import { SCENARIOS } from "../src/engine/scenarios";
import { getState, resetDemoData } from "../src/state/store";

const SK = ["sk", "live"].join("_") + "_"; // joined at runtime so no secret-shaped string sits whole in source
const classes = (t: string) => scanText(t).hits.map((h) => h.dataClass);

test("cards: Luhn and brand must both pass", () => {
  assert.ok(luhn("4111111111111111") && luhn("5555555555554444") && luhn("378282246310005"));
  assert.ok(!luhn("4111111111111112"));
  assert.deepEqual(classes("pay with 4111 1111 1111 1111 now"), ["PCI.CARD"]);
  assert.deepEqual(classes("amex 3782-822463-10005"), ["PCI.CARD"]);
  assert.deepEqual(classes("order 4111 1111 1111 1112"), [], "bad check digit");
  assert.deepEqual(classes("id 1234 5678 9012 3456"), [], "valid length but no brand");
  assert.deepEqual(classes("ts 1696512345678"), [], "a timestamp is not a card");
});

test("SSN: only numbers the SSA issues", () => {
  assert.deepEqual(classes("ssn 123-45-6789"), ["PII.SSN"]);
  for (const bad of ["000-12-3456", "666-12-3456", "900-12-3456", "123-00-6789", "123-45-0000"]) assert.deepEqual(classes(bad), [], bad);
  assert.deepEqual(classes("Social Security number 123456789"), ["PII.SSN"]);
  assert.deepEqual(classes("order 123456789"), [], "nine digits with no SSN words");
});

test("secrets: real formats found, placeholders ignored and reported", () => {
  const stripe = SK + "51Hq9ZkT3mXvB8wLp2NcR7yD";
  const aws = "AKIAQ3J7Z9XK2MBV4TRP";
  const r = scanText(`STRIPE=${stripe}\naws ${aws}\n-----BEGIN RSA PRIVATE KEY-----\nDB_PASSWORD=Tr0ub4dor&3x`);
  assert.deepEqual(r.hits.map((h) => h.dataClass).sort(), ["CREDENTIAL.API_KEY", "CREDENTIAL.API_KEY", "CREDENTIAL.PASSWORD", "CREDENTIAL.PRIVATE_KEY"].sort());
  const ph = scanText(`${SK}51Hxxxxxxxxxxxxxxxxxxxxxxxx AKIAIOSFODNN7EXAMPLE password=changeme API_KEY=\${API_KEY} token=process.env.TOKEN`);
  assert.equal(ph.hits.length, 0);
  assert.ok(ph.ignored.length >= 4, "each placeholder is reported, not silently dropped");
});

test("nothing raw is ever returned", () => {
  const secrets = [SK + "51Hq9ZkT3mXvB8wLp2NcR7yD", "AKIAQ3J7Z9XK2MBV4TRP", "Tr0ub4dor&3x", "4111111111111111", "123-45-6789"];
  const out = JSON.stringify(scanText(`k ${secrets[0]} ${secrets[1]} DB_PASSWORD=${secrets[2]} card ${secrets[3]} ssn ${secrets[4]}`));
  for (const s of secrets) assert.ok(!out.includes(s), `${s} leaked`);
});

test("email, phone, exact match and code", () => {
  assert.deepEqual(classes("write alice@example.com or call +1 415 555 0100").sort(), ["PII.EMAIL", "PII.PHONE"]);
  assert.deepEqual(classes("call 4155550100"), [], "bare digits are not a phone");
  assert.deepEqual(classes("call 111-555-0100"), [], "area codes start at 2");
  assert.deepEqual(classes("+44 20 7946 0958"), ["PII.PHONE"]);
  assert.deepEqual(classes("see VRD-CUST-0921 and VRD-CUST-9999"), ["CUSTOM.CUSTOMER_ID"], "only registered values match exactly");
  const code = "import { db } from './db';\nexport async function pay(id: string) {\n  const row = await db.get(id);\n  if (!row) { return null; }\n  return row;\n}\n";
  assert.deepEqual(classes(code), ["SOURCE_CODE"]);
  assert.deepEqual(classes("Please review the attached document and let me know.\nThanks, Alex\nSent from my phone"), []);
  assert.ok(entropy("aaaa") < entropy("a8Kd93Lx"));
});

test("every testable scanner is registered, and untestable ones say so", () => {
  for (const d of DETECTORS) assert.ok(SCANNER_INFO[d.id], `${d.id} has plain info`);
  const emitted = new Set(["pii-email-v2", "pii-phone-v2", "gov-id-v1", "secrets-v2", "code-detect-v1", "edm-financial-v1", "pci-card-v1"]);
  for (const d of DETECTORS) assert.equal(SCANNER_INFO[d.id].testable, emitted.has(d.id), d.id);
  for (const h of scanText("a@b.co 4111 1111 1111 1111 VRD-CUST-0921").hits) assert.ok(DETECTORS.find((d) => d.id === h.detector)?.detects.includes(h.dataClass), "a hit's class belongs to its scanner");
});

test("findings group by data type like the engine expects", () => {
  const f = toFindings(scanText("a@x.com b@y.org 4111 1111 1111 1111").hits);
  assert.deepEqual(f.map((x) => [x.dataClass, x.count]).sort(), [["PCI.CARD", 1], ["PII.EMAIL", 2]]);
});

test("rules using a scanner come from active rules only", () => {
  resetDemoData();
  const { contracts } = getState();
  const uses = rulesUsing("secrets-v2", contracts);
  for (const u of uses) assert.ok(contracts.some((c) => c.status === "ACTIVE" && c.name === u.contract));
  assert.deepEqual(rulesUsing("ner-person-v1", []), []);
});

test("scenarios: what each scenario says was found matches a real scan of its own payload", () => {
  const real = new Set(["pii-email-v2", "pii-phone-v2", "gov-id-v1", "secrets-v2", "code-detect-v1", "edm-financial-v1", "pci-card-v1"]);
  const gaps: string[] = [];
  for (const sc of SCENARIOS) {
    if (!sc.payload || !sc.findings) continue;
    const scan = scanText(sc.payload).hits;
    for (const f of sc.findings) {
      if (!DETECTORS.some((d) => real.has(d.id) && d.detects.includes(f.dataClass))) continue;
      const n = scan.filter((h) => h.dataClass === f.dataClass).length;
      if (n === 0) gaps.push(`${sc.id}: scripted ${f.dataClass} x${f.count}, real scan found nothing`);
      else if (f.count <= 20 && n !== f.count) gaps.push(`${sc.id}: scripted ${f.dataClass} x${f.count}, real scan found ${n}`);
    }
  }
  assert.deepEqual(gaps, []);
});

test("prose with code-like words is not code", () => {
  assert.deepEqual(classes("Please return the signed form; we will export the report later.\nThe function of this team is support."), []);
  assert.deepEqual(classes("Dear team,\nPlease review the plan.\nBest, Maya"), []);
});
