// ============================================================================
// Registries — pluggable data types, detectors, destinations, transforms,
// capability states. Mirrors the Core Brain registry architecture.
// Everything here is simulation data; the shapes match the product model.
// ============================================================================

import type { CoverageStatus, DestinationClass } from "./types";

export interface DataTypeDef {
  id: string;
  family: string;
  label: string;
  example: string;
  severity: "low" | "moderate" | "high" | "critical";
}

export const DATA_TYPES: DataTypeDef[] = [
  { id: "PII.EMAIL", family: "PII", label: "Email address", example: "alice@example.com", severity: "moderate" },
  { id: "PII.PHONE", family: "PII", label: "Phone number", example: "+1 415 555 0100", severity: "moderate" },
  { id: "PII.NAME", family: "PII", label: "Person name", example: "Alice Johnson", severity: "low" },
  { id: "PII.SSN", family: "PII", label: "Government ID (SSN)", example: "***-**-6789", severity: "critical" },
  { id: "CREDENTIAL.API_KEY", family: "CREDENTIAL", label: "API key", example: "sk_live_••••", severity: "critical" },
  { id: "CREDENTIAL.PRIVATE_KEY", family: "CREDENTIAL", label: "Private key", example: "-----BEGIN RSA PRIVATE KEY-----", severity: "critical" },
  { id: "CREDENTIAL.PASSWORD", family: "CREDENTIAL", label: "Password", example: "DB_PASSWORD=••••", severity: "critical" },
  { id: "SOURCE_CODE", family: "IP", label: "Source code", example: "checkout.ts", severity: "moderate" },
  { id: "FINANCIAL.ACCOUNT", family: "FINANCIAL", label: "Account number", example: "ACCT-••••8842", severity: "high" },
  { id: "PCI.CARD", family: "PCI", label: "Payment card", example: "4•••-••••-••••-1234", severity: "critical" },
  { id: "HEALTH.PHI", family: "PHI", label: "Protected health info", example: "Discharge summary", severity: "critical" },
  { id: "HR.COMPENSATION", family: "HR", label: "Compensation data", example: "base_salary", severity: "high" },
  { id: "LEGAL.PRIVILEGED", family: "LEGAL", label: "Privileged material", example: "Attorney-client memo", severity: "high" },
  { id: "COMPANY.ROADMAP", family: "COMPANY", label: "Product roadmap", example: "FY27 roadmap", severity: "high" },
  { id: "COMPANY.TRADE_SECRET", family: "COMPANY", label: "Trade secret", example: "Pricing model", severity: "critical" },
  { id: "CUSTOM.CUSTOMER_ID", family: "CUSTOM", label: "Veridian customer ID", example: "VRD-CUST-0921", severity: "high" },
];

export interface DetectorDef {
  id: string;
  version: string;
  method: string;
  detects: string[];
  status: CoverageStatus;
}

export const DETECTORS: DetectorDef[] = [
  { id: "pii-email-v2", version: "2.4.1", method: "pattern + context", detects: ["PII.EMAIL"], status: "ENFORCED" },
  { id: "pii-phone-v2", version: "2.2.0", method: "pattern + libphonenumber", detects: ["PII.PHONE"], status: "ENFORCED" },
  { id: "ner-person-v1", version: "1.8.3", method: "NER model", detects: ["PII.NAME"], status: "ENFORCED" },
  { id: "gov-id-v1", version: "1.1.0", method: "pattern + checksum", detects: ["PII.SSN"], status: "ENFORCED" },
  { id: "secrets-v2", version: "2.9.0", method: "entropy + rule corpus", detects: ["CREDENTIAL.API_KEY", "CREDENTIAL.PRIVATE_KEY", "CREDENTIAL.PASSWORD"], status: "ENFORCED" },
  { id: "code-detect-v1", version: "1.3.2", method: "tree-sitter classification", detects: ["SOURCE_CODE"], status: "ENFORCED" },
  { id: "edm-financial-v1", version: "1.0.4", method: "exact data match", detects: ["FINANCIAL.ACCOUNT", "CUSTOM.CUSTOMER_ID"], status: "ENFORCED" },
  { id: "pci-card-v1", version: "1.5.0", method: "pattern + Luhn", detects: ["PCI.CARD"], status: "ENFORCED" },
  { id: "phi-semantic-v1", version: "0.9.1", method: "semantic classifier", detects: ["HEALTH.PHI"], status: "DEGRADED" },
  { id: "label-mip-v1", version: "1.2.0", method: "enterprise labels", detects: ["LEGAL.PRIVILEGED", "HR.COMPENSATION"], status: "ENFORCED" },
  { id: "semantic-company-v1", version: "0.7.0", method: "semantic classifier", detects: ["COMPANY.ROADMAP", "COMPANY.TRADE_SECRET"], status: "DEGRADED" },
  { id: "ocr-vision-v1", version: "1.4.2", method: "OCR + downstream detectors", detects: ["HEALTH.PHI", "PII.EMAIL", "PII.PHONE"], status: "ENFORCED" },
];

export interface DestinationDef {
  id: string;
  label: string;
  class: DestinationClass;
  host: string;
}

export const DESTINATIONS: DestinationDef[] = [
  { id: "dest-approved-ai", label: "Enterprise AI (approved)", class: "APPROVED_AI", host: "ai.enterprise.example" },
  { id: "dest-chatgpt", label: "ChatGPT (approved)", class: "APPROVED_AI", host: "chatgpt.com" },
  { id: "dest-claude", label: "Claude (approved)", class: "APPROVED_AI", host: "claude.ai" },
  { id: "dest-unapproved-ai", label: "FreeAIChat (known, unapproved)", class: "UNAPPROVED_AI", host: "freeaichat.example" },
  { id: "dest-salesforce", label: "Salesforce (approved SaaS)", class: "APPROVED_SAAS", host: "veridian.my.salesforce.com" },
  { id: "dest-internal", label: "Internal analytics", class: "INTERNAL", host: "analytics.veridian.internal" },
  { id: "dest-partner", label: "Meridian Partners portal", class: "PARTNER", host: "portal.meridianpartners.example" },
  { id: "dest-generic", label: "Generic external site", class: "GENERIC_EXTERNAL", host: "filedrop.example.org" },
  { id: "dest-unknown", label: "Unknown external endpoint", class: "UNKNOWN_EXTERNAL", host: "185.220.101.42" },
];

export interface CapabilityDef {
  id: string;
  label: string;
  plane: "ENDPOINT" | "NETWORK" | "GATEWAY" | "BRAIN";
  status: CoverageStatus;
  note: string;
}

// Deliberately not all-green: a believable enterprise product shows its gaps.
export const CAPABILITIES: CapabilityDef[] = [
  { id: "cap-net-https", label: "HTTPS interception", plane: "NETWORK", status: "ENFORCED", note: "Network Extension routes HTTPS through Wrapbox" },
  { id: "cap-net-quic", label: "QUIC / HTTP3", plane: "NETWORK", status: "DEGRADED", note: "QUIC downgraded to HTTP/2 for inspection; some apps retry" },
  { id: "cap-net-websocket", label: "WebSocket inspection", plane: "NETWORK", status: "ENFORCED", note: "Frame-level inspection" },
  { id: "cap-net-file", label: "File upload inspection", plane: "NETWORK", status: "ENFORCED", note: "Multipart + streaming bodies" },
  { id: "cap-parse-office", label: "Office/PDF parsing", plane: "BRAIN", status: "ENFORCED", note: "PDF, DOCX, XLSX, CSV, JSON, YAML" },
  { id: "cap-parse-archive", label: "Archive traversal", plane: "BRAIN", status: "ENFORCED", note: "ZIP/TAR up to depth 5, bomb-guarded" },
  { id: "cap-parse-encrypted", label: "Encrypted content", plane: "BRAIN", status: "UNINSPECTABLE", note: "Cannot inspect; policy decides fail mode" },
  { id: "cap-ocr", label: "Image / scan OCR", plane: "BRAIN", status: "ENFORCED", note: "Vision OCR for scanned documents" },
  { id: "cap-semantic", label: "Semantic classification", plane: "BRAIN", status: "DEGRADED", note: "ONNX classifier v0.7 — precision improving" },
  { id: "cap-ep-file", label: "File open/read/write authorization", plane: "ENDPOINT", status: "ENFORCED", note: "Endpoint Security entitlement active (simulated)" },
  { id: "cap-ep-exec", label: "Process execution authorization", plane: "ENDPOINT", status: "ENFORCED", note: "exec/posix_spawn authorization (simulated)" },
  { id: "cap-ep-clipboard", label: "Clipboard control", plane: "ENDPOINT", status: "PENDING", note: "Planned; not yet enforced" },
  { id: "cap-gw-github", label: "GitHub gateway", plane: "GATEWAY", status: "ENFORCED", note: "Push/PR/branch operations governed" },
  { id: "cap-gw-sql", label: "SQL gateway", plane: "GATEWAY", status: "ENFORCED", note: "Query preflight + row estimates" },
  { id: "cap-gw-cloud", label: "Cloud (AWS) gateway", plane: "GATEWAY", status: "DEGRADED", note: "IAM, S3 and ECS deploys governed; other AWS services (Lambda, CloudFormation…) understood only" },
  { id: "cap-gw-saas", label: "SaaS API gateway", plane: "GATEWAY", status: "ENFORCED", note: "Stripe refunds and support-desk calls pass through the gateway" },
  { id: "cap-gw-mcp", label: "MCP gateway", plane: "GATEWAY", status: "UNDERSTOOD_ONLY", note: "MCP calls observed and classified; enforcement rolling out" },
];

export const TRANSFORMS: { kind: string; label: string; reversible: boolean; example: string }[] = [
  { kind: "REDACT", label: "Redact", reversible: false, example: "alice@example.com → [REDACTED:EMAIL]" },
  { kind: "MASK", label: "Mask", reversible: false, example: "4111-1111-1111-1234 → ••••-••••-••••-1234" },
  { kind: "REVERSIBLE_TOKENIZE", label: "Reversible tokenize", reversible: true, example: "alice@example.com → EMAIL_TOKEN_001" },
  { kind: "HASH", label: "Hash", reversible: false, example: "VRD-CUST-0921 → h:9f2ac1…" },
  { kind: "DROP_FIELD", label: "Drop field", reversible: false, example: "salary column removed" },
  { kind: "GENERALIZE", label: "Generalize", reversible: false, example: "age 34 → 30–39" },
  { kind: "DATE_SHIFT", label: "Date shift", reversible: false, example: "2026-03-14 → 2026-03-02 (±30d)" },
  { kind: "FORMAT_PRESERVING", label: "Format-preserving", reversible: true, example: "+1 415 555 0100 → +1 415 090 4417" },
  { kind: "LIMIT", label: "Limit", reversible: false, example: "500,000 rows → first 500 rows" },
  { kind: "REWRITE", label: "Rewrite", reversible: false, example: "prompt rewritten without sensitive span" },
];

export const ACTION_VERBS = [
  "READ", "WRITE", "DELETE", "EXECUTE", "NETWORK_SEND",
  "SECRET_ACCESS", "PERMISSION_CHANGE", "SECURITY_CHANGE", "DEPLOY", "DATA_EXPORT",
] as const;

// Different raw mechanisms normalize to the same verb — Action Ontology demo.
export const ACTION_NORMALIZATION: { raw: string; via: string; verb: string }[] = [
  { raw: "rm build/tmp.txt", via: "shell", verb: "DELETE" },
  { raw: "os.remove('build/tmp.txt')", via: "Python", verb: "DELETE" },
  { raw: "fs.unlink('build/tmp.txt')", via: "Node.js", verb: "DELETE" },
  { raw: "cat .env", via: "shell", verb: "SECRET_ACCESS" },
  { raw: "open('.env').read()", via: "Python", verb: "SECRET_ACCESS" },
  { raw: "git push --force origin main", via: "git", verb: "WRITE" },
  { raw: "DROP TABLE customers", via: "SQL", verb: "DELETE" },
  { raw: "iam:AttachRolePolicy AdministratorAccess", via: "AWS API", verb: "PERMISSION_CHANGE" },
  { raw: "spctl --master-disable", via: "shell", verb: "SECURITY_CHANGE" },
];

export function destById(id: string): DestinationDef | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}
export function dataTypeById(id: string): DataTypeDef | undefined {
  return DATA_TYPES.find((d) => d.id === id);
}
export function detectorFor(dataClass: string): DetectorDef | undefined {
  return DETECTORS.find((d) => d.detects.includes(dataClass));
}
