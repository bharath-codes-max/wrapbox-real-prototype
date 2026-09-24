// ============================================================================
// Veridian Systems — coherent fictional enterprise. Identities used everywhere
// so every screen agrees on who did what with which agent against what.
// ============================================================================

export interface OrgUser {
  id: string;
  name: string;
  role: string;
  email: string;
}
export interface OrgDevice {
  id: string;
  name: string;
  owner: string;
  os: string;
  enrolled: boolean;
}
export interface OrgAgent {
  id: string;
  name: string;
  provider: string;
  kind: "coding" | "chat" | "internal" | "copilot" | "unknown";
  owner?: string;
  device?: string;
  environment: string;
  tools: string[];
  destinations: string[];
  discovered: boolean; // true = auto-discovered, not registered
  trust: "trusted" | "conditional" | "untrusted" | "unknown";
  risk: "low" | "moderate" | "high" | "critical";
}
export interface OrgResource {
  id: string;
  name: string;
  kind: "repo" | "database" | "cloud" | "saas" | "mcp" | "file" | "secret";
  environment: "development" | "test" | "staging" | "production" | "local";
  sensitivity: "disposable" | "internal" | "sensitive" | "customer-impacting";
  detail: string;
}

export const ORG = { name: "Veridian Systems", domain: "veridian.example" };

export const USERS: OrgUser[] = [
  { id: "u-priya", name: "Priya Menon", role: "Admin", email: "priya.menon@veridian.example" },
  { id: "u-daniel", name: "Daniel Kim", role: "Developer", email: "daniel.kim@veridian.example" },
  { id: "u-maya", name: "Maya Chen", role: "Security Analyst", email: "maya.chen@veridian.example" },
  { id: "u-alex", name: "Alex Morgan", role: "Engineering Manager", email: "alex.morgan@veridian.example" },
];

export const DEVICES: OrgDevice[] = [
  { id: "d-priya-mbp", name: "Priya-MBP", owner: "u-priya", os: "macOS 15.6", enrolled: true },
  { id: "d-daniel-mbp", name: "Daniel-MBP", owner: "u-daniel", os: "macOS 15.5", enrolled: true },
  { id: "d-maya-mbp", name: "Maya-MBP", owner: "u-maya", os: "macOS 15.6", enrolled: true },
  { id: "d-fin-07", name: "Finance-Laptop-07", owner: "u-alex", os: "macOS 14.7", enrolled: true },
];

export const AGENTS: OrgAgent[] = [
  {
    id: "a-claude-code", name: "Claude Code", provider: "Anthropic", kind: "coding",
    owner: "u-daniel", device: "d-daniel-mbp", environment: "development",
    tools: ["shell", "file system", "GitHub MCP", "npm"], destinations: ["dest-claude", "dest-internal"],
    discovered: false, trust: "conditional", risk: "moderate",
  },
  {
    id: "a-codex", name: "Codex", provider: "OpenAI", kind: "coding",
    owner: "u-daniel", device: "d-daniel-mbp", environment: "development",
    tools: ["shell", "file system"], destinations: ["dest-chatgpt"],
    discovered: false, trust: "conditional", risk: "moderate",
  },
  {
    id: "a-chatgpt", name: "ChatGPT", provider: "OpenAI", kind: "chat",
    owner: "u-priya", device: "d-priya-mbp", environment: "local",
    tools: ["browser"], destinations: ["dest-chatgpt"],
    discovered: false, trust: "trusted", risk: "low",
  },
  {
    id: "a-claude", name: "Claude", provider: "Anthropic", kind: "chat",
    owner: "u-maya", device: "d-maya-mbp", environment: "local",
    tools: ["browser"], destinations: ["dest-claude"],
    discovered: false, trust: "trusted", risk: "low",
  },
  {
    id: "a-copilot", name: "Microsoft Copilot", provider: "Microsoft", kind: "copilot",
    owner: "u-alex", device: "d-fin-07", environment: "local",
    tools: ["browser", "M365"], destinations: ["dest-approved-ai"],
    discovered: false, trust: "trusted", risk: "low",
  },
  {
    id: "a-finance", name: "Internal Finance Agent", provider: "Veridian (internal)", kind: "internal",
    owner: "u-alex", device: "d-fin-07", environment: "production",
    tools: ["SQL MCP", "reporting API"], destinations: ["dest-internal"],
    discovered: false, trust: "conditional", risk: "high",
  },
  {
    id: "a-support", name: "Support Agent", provider: "Veridian (internal)", kind: "internal",
    owner: "u-maya", device: "d-maya-mbp", environment: "production",
    tools: ["Support SaaS API", "customer-db (read)"], destinations: ["dest-salesforce", "dest-internal"],
    discovered: false, trust: "conditional", risk: "moderate",
  },
  {
    id: "a-unknown-mcp", name: "Unknown MCP agent", provider: "unidentified", kind: "unknown",
    device: "d-fin-07", environment: "local",
    tools: ["unknown MCP server (tcp/7823)"], destinations: ["dest-unknown"],
    discovered: true, trust: "unknown", risk: "critical",
  },
];

export const RESOURCES: OrgResource[] = [
  { id: "r-checkout", name: "checkout-service", kind: "repo", environment: "development", sensitivity: "internal", detail: "GitHub · veridian/checkout-service · 214 files" },
  { id: "r-payments-prod", name: "payments-prod", kind: "database", environment: "production", sensitivity: "customer-impacting", detail: "PostgreSQL 16 · 8,421,392 customer rows" },
  { id: "r-customer-db", name: "customer-db", kind: "database", environment: "production", sensitivity: "customer-impacting", detail: "PostgreSQL 16 · 2,914,006 rows" },
  { id: "r-test-db", name: "scratch-test-db", kind: "database", environment: "test", sensitivity: "disposable", detail: "PostgreSQL 16 · 12 rows · disposable fixture" },
  { id: "r-aws-prod", name: "AWS Production", kind: "cloud", environment: "production", sensitivity: "customer-impacting", detail: "Account 84115520 · us-east-1" },
  { id: "r-aws-staging", name: "AWS Staging", kind: "cloud", environment: "staging", sensitivity: "internal", detail: "Account 84115521 · us-east-1" },
  { id: "r-github", name: "GitHub Organization", kind: "saas", environment: "production", sensitivity: "sensitive", detail: "github.com/veridian · 38 repos" },
  { id: "r-support-saas", name: "Support SaaS", kind: "saas", environment: "production", sensitivity: "sensitive", detail: "Salesforce Service Cloud" },
  { id: "r-env-file", name: ".env", kind: "secret", environment: "local", sensitivity: "sensitive", detail: "Local secrets file · 6 credentials" },
  { id: "r-src", name: "src/", kind: "file", environment: "local", sensitivity: "internal", detail: "Local working tree of checkout-service" },
  { id: "r-mcp-unknown", name: "Unknown MCP server", kind: "mcp", environment: "local", sensitivity: "sensitive", detail: "tcp/7823 · unregistered · discovered 2d ago" },
];

export function userById(id: string) { return USERS.find((u) => u.id === id); }
export function deviceById(id: string) { return DEVICES.find((d) => d.id === id); }
export function agentById(id: string) { return AGENTS.find((a) => a.id === id); }
export function resourceById(id: string) { return RESOURCES.find((r) => r.id === id); }
