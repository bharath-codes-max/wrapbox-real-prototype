// ============================================================================
// Wrapbox Real Prototype — canonical model types
// One SimulationEvent shape feeds every surface: Simulation Lab, Control Room,
// Live Actions, Agents, Review Center, Evidence, Coverage, Trust Graph.
// ============================================================================

export type Decision = "ALLOW" | "CONSTRAIN" | "REVIEW" | "BLOCK";
export type Plane = "ENDPOINT" | "NETWORK" | "GATEWAY";

export type ActionVerb =
  | "READ"
  | "WRITE"
  | "DELETE"
  | "EXECUTE"
  | "NETWORK_SEND"
  | "SECRET_ACCESS"
  | "PERMISSION_CHANGE"
  | "SECURITY_CHANGE"
  | "DEPLOY"
  | "DATA_EXPORT";

export type Environment = "development" | "test" | "staging" | "production" | "local";

export type DestinationClass =
  | "APPROVED_AI"
  | "UNAPPROVED_AI"
  | "APPROVED_SAAS"
  | "INTERNAL"
  | "PARTNER"
  | "GENERIC_EXTERNAL"
  | "UNKNOWN_EXTERNAL";

export type CoverageStatus =
  | "ENFORCED"
  | "DEGRADED"
  | "UNDERSTOOD_ONLY"
  | "PENDING"
  | "UNINSPECTABLE";

export type TransformKind =
  | "REDACT"
  | "MASK"
  | "REVERSIBLE_TOKENIZE"
  | "HASH"
  | "DROP_FIELD"
  | "GENERALIZE"
  | "DATE_SHIFT"
  | "FORMAT_PRESERVING"
  | "LIMIT"
  | "REWRITE";

export interface DetectorFinding {
  dataClass: string; // e.g. "PII.EMAIL"
  detector: string; // e.g. "pii-email-v2"
  detectorVersion: string;
  confidence: number;
  sample?: string; // masked sample of what matched (never raw secrets)
  count: number;
}

export interface InspectionResult {
  inspectable: boolean;
  reason?: string; // when uninspectable: "AES-encrypted archive", etc.
  parser?: string;
  findings: DetectorFinding[];
}

export interface TransformStep {
  kind: TransformKind;
  dataClass: string;
  before: string;
  after: string;
  tokenId?: string;
}

export interface BlastRadius {
  files?: number;
  rows?: number;
  recipients?: number;
  spendUsd?: number;
  records?: number;
  dependencies?: string[];
  label: string; // human-readable summary
  severity: "low" | "moderate" | "high" | "critical";
}

export interface EventContext {
  environment: Environment;
  resourceSensitivity: "disposable" | "internal" | "sensitive" | "customer-impacting";
  privileged: boolean;
  businessHours: boolean;
  notes?: string[];
}

export interface MatchedClause {
  contractId: string;
  contractName: string;
  clauseId: string;
  clauseText: string;
  effect?: Decision; // what this clause demands (absent on events recorded before this field existed)
}

/** Which layer of the Core Brain produced the final decision. */
export interface DecidedBy {
  layer: "contract" | "safety" | "blast" | "context" | "envelope" | "uninspectable" | "breakglass" | "default";
  clauseId?: string; // set when layer === "contract"
  ruleId?: string; // set when layer === "safety"
  label: string; // human-readable, e.g. the clause text or rule name
}

export interface SafetyRuleHit {
  ruleId: string;
  name: string;
  description: string;
}

export interface ReviewState {
  status: "pending" | "approved" | "approved_scoped" | "constrained" | "denied" | "expired";
  reviewer?: string;
  note?: string;
  scope?: string;
  decidedAt?: number;
  expiresAt: number;
  bundleId?: string;
  safeAlternative?: string;
}

export interface EvidenceRecord {
  eventId: string;
  hash: string; // simulated tamper-evident chain hash
  prevHash: string;
  chain: { label: string; detail: string }[]; // causal chain nodes
}

export interface SimulationEvent {
  id: string;
  seq: number;
  timestamp: number;
  scenario?: string; // scenario id when produced by Simulation Lab
  user: string; // user id
  device: string; // device id
  agent: string; // agent id
  application?: string; // e.g. browser, terminal
  plane: Plane;
  action: ActionVerb;
  actionRaw?: string; // e.g. "rm -rf tmp/", "os.remove()", "git push --force"
  resource: string; // resource id or path
  environment: Environment;
  destination?: string; // destination id
  destinationClass?: DestinationClass;
  dataClasses: string[];
  inspection?: InspectionResult;
  matchedContracts: MatchedClause[];
  safetyRules: SafetyRuleHit[];
  safetyObserved?: SafetyRuleHit[]; // kernel rules in observe mode that would have fired
  decidedBy?: DecidedBy;
  context: EventContext;
  blastRadius?: BlastRadius;
  capabilityState: CoverageStatus; // enforcement capability at this point
  decision: Decision;
  decisionReasons: string[];
  safeAlternative?: string;
  transformation?: TransformStep[];
  payloadBefore?: string;
  payloadAfter?: string;
  reviewState?: ReviewState;
  taskId?: string;
  stepIndex?: number;
  dependsOn?: number[];
  status: "completed" | "blocked" | "parked" | "pending_review" | "transformed" | "in_progress";
  risk: "low" | "moderate" | "high" | "critical";
  evidence: EvidenceRecord;
  breakGlass?: boolean;
}

// ---------------------------------------------------------------------------
// Intent Contracts
// ---------------------------------------------------------------------------

export interface ContractClause {
  id: string;
  text: string; // natural-language clause
  dataClasses: string[];
  destinations: DestinationClass[] | "ANY";
  actions: ActionVerb[] | "ANY";
  environments?: Environment[];
  effect: Decision; // what this clause demands when matched
  transform?: TransformKind;
  requiredCapabilities: string[]; // capability registry ids
  failClosed: boolean;
}

export interface IntentContract {
  id: string;
  name: string;
  author: string;
  createdAt: number;
  version: number;
  status: "ACTIVE" | "DRAFT" | "DEACTIVATED";
  sourceText: string; // the natural-language contract
  clauses: ContractClause[];
  // Snapshot only. Screens must read engine/coverage.ts contractCoverage(),
  // which derives it live from the clauses' required capabilities.
  coverage: CoverageStatus;
}

// ---------------------------------------------------------------------------
// Tasks / envelopes / permits
// ---------------------------------------------------------------------------

export interface TaskEnvelope {
  taskId: string;
  title: string; // "Fix checkout"
  agent: string;
  user: string;
  allowedResources: string[];
  allowedActions: ActionVerb[];
  environment: Environment;
  forbidden: string[];
  durationMin: number;
  startedAt: number;
  fileBudget: number;
  filesUsed: number;
  status: "active" | "completed" | "parked" | "expired";
  steps: TaskStep[];
}

export interface TaskStep {
  index: number;
  label: string;
  action: ActionVerb;
  resource: string;
  dependsOn: number[];
  state: "pending" | "running" | "done" | "parked" | "blocked" | "waiting_dependency";
  decision?: Decision;
  eventId?: string;
}

export interface StandingPermission {
  id: string;
  agent: string;
  scope: string;
  allowed: string[];
  forbidden: string[];
  window: string;
  expiresAt: number;
  maxFilesPerTask: number;
  grantedBy: string;
  status: "active" | "expired" | "revoked";
}

export interface BreakGlassSession {
  id: string;
  requester: string;
  reason: string;
  scope: string;
  durationMin: number;
  startedAt: number;
  active: boolean;
}

export interface VaultToken {
  id: string;
  dataClass: string;
  createdAt: number;
  scope: string;
  expiresAt: number;
  restorable: boolean;
  eventId: string;
}

/** One attempt to turn a token back into its original value. */
export interface RestoreRecord {
  id: string;
  tokenId: string;
  requester: string; // who asked, e.g. "Priya Menon (inside Veridian)" or "claude.ai"
  inside: boolean; // inside the company's authorized scope?
  allowed: boolean;
  reason: string;
  at: number;
}

export interface AutopilotRecommendation {
  id: string;
  observation: string;
  recommendation: string;
  basedOnEvents: number;
  status: "open" | "accepted" | "modified" | "dismissed";
}
