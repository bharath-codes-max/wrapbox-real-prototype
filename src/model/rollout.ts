// Rollout targets — the places an admin connects Wrapbox during onboarding
// (Step 4). Each target is tied to capability ids in the Capability Registry,
// so the status it can reach is the SAME truth the Coverage Map shows: a
// target whose capability is UNDERSTOOD_ONLY can be connected for visibility,
// but never claims enforcement. The rollout itself is simulated.
import { CAPABILITIES } from "./registries";
import type { OrgAgent } from "./org";

export type AgentKind = OrgAgent["kind"];

export interface RolloutTarget {
  id: string;
  name: string;
  logo: string;            // bundled vendor mark (see ui/logos)
  plane: "ENDPOINT" | "NETWORK" | "GATEWAY";
  caps: string[];          // capability ids this target provides
  governs: AgentKind[];    // agent kinds this target puts a guard on
  method: string;          // how an admin deploys it
  detail: string;          // one line on what it does
  phases: [string, string, string, string]; // simulated rollout log
  checkIn: string;         // what proves it connected
}

export const ROLLOUT: RolloutTarget[] = [
  {
    id: "endpoint", name: "macOS Endpoint runtime", logo: "apple", plane: "ENDPOINT",
    caps: ["cap-ep-file", "cap-ep-exec"], governs: ["coding", "unknown"],
    method: "Push with MDM (Jamf / Intune)", detail: "File, process and secrets decisions on every managed laptop",
    phases: ["Queued in Jamf / Intune", "Pushing the runtime to managed laptops", "Devices checking in with Wrapbox", "Connected — laptops reporting"],
    checkIn: "Endpoint Security extension heartbeat from each enrolled Mac",
  },
  {
    id: "network", name: "Network Extension", logo: "wrapbox-icon", plane: "NETWORK",
    caps: ["cap-net-https", "cap-net-websocket", "cap-net-file"], governs: ["chat", "copilot", "unknown"],
    method: "Push with MDM (content-filter profile)", detail: "What leaves each laptop for AI tools and other sites",
    phases: ["Signing the content-filter profile", "Pushing the profile via MDM", "Laptops routing HTTPS through Wrapbox", "Connected — traffic inspected"],
    checkIn: "First inspected upload from an enrolled laptop",
  },
  {
    id: "gw-github", name: "GitHub gateway", logo: "github_light", plane: "GATEWAY",
    caps: ["cap-gw-github"], governs: ["coding"],
    method: "Install the Wrapbox GitHub App (org-wide)", detail: "Push, PR and branch operations by agents",
    phases: ["Redirecting to github.com", "Installing on the organization", "Registering branch-protection hooks", "Connected — pushes governed"],
    checkIn: "First governed push event",
  },
  {
    id: "gw-sql", name: "SQL gateway", logo: "postgresql", plane: "GATEWAY",
    caps: ["cap-gw-sql"], governs: ["internal", "coding"],
    method: "Point agents' database URL at the gateway", detail: "Query preflight, row estimates and destructive-statement checks",
    phases: ["Deploying the gateway (Docker / Helm)", "Rotating agent DB credentials to the gateway", "First query proxied", "Connected — queries preflighted"],
    checkIn: "First proxied query",
  },
  {
    id: "gw-cloud", name: "AWS gateway", logo: "aws", plane: "GATEWAY",
    caps: ["cap-gw-cloud"], governs: ["coding", "internal"],
    method: "Assume-role through the Wrapbox gateway", detail: "IAM, S3 and ECS deploys governed; other AWS services observed",
    phases: ["Creating the Wrapbox broker role", "Scoping agent roles to the broker", "First API call brokered", "Connected — IAM/S3/ECS governed"],
    checkIn: "First brokered AWS API call",
  },
  {
    id: "gw-saas", name: "Stripe & support-desk gateway", logo: "stripe", plane: "GATEWAY",
    caps: ["cap-gw-saas"], governs: ["internal"],
    method: "Swap the agents' API keys for gateway keys", detail: "Refunds, tickets and customer replies",
    phases: ["Minting gateway-scoped API keys", "Swapping keys in the agents' config", "First API call proxied", "Connected — refunds governed"],
    checkIn: "First proxied SaaS call",
  },
  {
    id: "gw-mcp", name: "MCP gateway", logo: "mcp", plane: "GATEWAY",
    caps: ["cap-gw-mcp"], governs: ["unknown", "internal"],
    method: "Point MCP clients at the gateway", detail: "MCP tool calls observed and classified",
    phases: ["Deploying the MCP gateway", "Registering known MCP servers", "First tool call observed", "Connected — observing only"],
    checkIn: "First observed MCP tool call",
  },
];

/** The best status a target can reach — the weakest of its capabilities, straight from the registry. */
export function rolloutStatus(t: RolloutTarget): "ENFORCED" | "DEGRADED" | "UNDERSTOOD_ONLY" | "PENDING" {
  const rank = { ENFORCED: 0, DEGRADED: 1, UNDERSTOOD_ONLY: 2, PENDING: 3, UNINSPECTABLE: 3 } as const;
  let worst: keyof typeof rank = "ENFORCED";
  for (const id of t.caps) {
    const st = CAPABILITIES.find((c) => c.id === id)?.status ?? "PENDING";
    if (rank[st] > rank[worst]) worst = st;
  }
  return worst === "UNINSPECTABLE" ? "PENDING" : worst;
}

export const rolloutById = (id: string) => ROLLOUT.find((t) => t.id === id);
