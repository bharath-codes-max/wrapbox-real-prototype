// Integrations — simulated enterprise connections. Each connection's status is
// derived from the capability registry (the same one Coverage uses), and its
// usage from the recorded events; nothing here is a typed-in figure.
import { useAppState } from "../state/store";
import {
  PageHead, Chip, StatusChip, SimNote, SectionHead, DecisionChip, names,
  MetricBar, Avatar, AgentMark, DestMark, PageTabs,
} from "../ui/kit";
import { RESOURCES, DEVICES, USERS, AGENTS, deviceById, userById, resourceById } from "../model/org";
import { ACTION_NORMALIZATION, CAPABILITIES } from "../model/registries";
import { logoUrl } from "../ui/logos";
import { describe } from "../ui/describe";
import type { SimulationEvent } from "../model/types";
import { Plug, Laptop, Fingerprint, Shuffle, ArrowRight } from "lucide-react";

interface Connection {
  name: string; logo: string; kind: string; caps: string[]; detail: string;
  uses: (e: SimulationEvent) => boolean;
}

const enrolled = DEVICES.filter((d) => d.enrolled).length;
const discovered = AGENTS.filter((a) => a.discovered).length;

const CONNECTIONS: Connection[] = [
  { name: "GitHub Organization", logo: "github_light", kind: "Gateway connector", caps: ["cap-gw-github"],
    detail: "github.com/veridian · push, PR and branch operations on checkout-service",
    uses: (e) => e.application === "GitHub MCP" || (e.plane === "GATEWAY" && e.resource === "r-checkout") },
  { name: "PostgreSQL gateway", logo: "postgresql", kind: "Gateway connector", caps: ["cap-gw-sql"],
    detail: "payments-prod, customer-db · query preflight + row estimates",
    uses: (e) => e.application === "SQL MCP" || e.resource === "r-customer-db" || e.resource === "r-payments-prod" },
  { name: "AWS", logo: "aws", kind: "Gateway connector", caps: ["cap-gw-cloud"],
    detail: "Production and staging accounts",
    uses: (e) => e.application === "AWS API" || e.resource.startsWith("r-aws") },
  { name: "Stripe & support desk", logo: "stripe", kind: "Gateway connector", caps: ["cap-gw-saas"],
    detail: "Refunds, tickets and customer replies",
    uses: (e) => e.application === "Stripe API" || e.application === "Support SaaS API" || e.resource === "r-stripe" },
  { name: "macOS Endpoint runtime", logo: "wrapbox-icon", kind: "Endpoint plane", caps: ["cap-ep-file", "cap-ep-exec", "cap-ep-clipboard"],
    detail: `${enrolled} enrolled devices · file and process authorization`,
    uses: (e) => e.plane === "ENDPOINT" },
  { name: "Network Extension", logo: "wrapbox-icon", kind: "Network plane", caps: ["cap-net-https", "cap-net-quic", "cap-net-websocket", "cap-net-file"],
    detail: "What leaves each device for AI tools and other sites",
    uses: (e) => e.plane === "NETWORK" },
  { name: "MCP registry", logo: "mcp", kind: "Gateway connector", caps: ["cap-gw-mcp"],
    detail: `${discovered} unknown MCP server${discovered === 1 ? "" : "s"} discovered, not registered`,
    uses: (e) => !!AGENTS.find((a) => a.id === e.agent)?.discovered },
];

const RANK: Record<string, number> = { ENFORCED: 0, DEGRADED: 1, UNDERSTOOD_ONLY: 2, UNINSPECTABLE: 3 };
const capOf = (id: string) => CAPABILITIES.find((c) => c.id === id)!;
/** Worst live capability; planned (PENDING) ones are listed but don't count yet. */
function statusOf(c: Connection): string {
  const live = c.caps.map(capOf).filter((x) => x.status !== "PENDING");
  return live.reduce((w, x) => ((RANK[x.status] ?? 0) > (RANK[w] ?? 0) ? x.status : w), "ENFORCED");
}

// Decorative brand mark for a governed resource / application — derived purely
// from the resource's own name and kind (no new data, no logic change).
function resLogo(r?: { name: string; kind: string }): string {
  const name = r?.name ?? "";
  if (/github/i.test(name) || r?.kind === "repo") return "github_light";
  if (r?.kind === "database") return "postgresql";
  if (r?.kind === "cloud") return "aws";
  if (/stripe/i.test(name)) return "stripe";
  if (/salesforce|support/i.test(name)) return "salesforce";
  if (r?.kind === "mcp") return "mcp";
  return "wrapbox-icon";
}
const APP_LOGO: Record<string, string> = {
  "GitHub MCP": "github_light", "SQL MCP": "postgresql", "AWS API": "aws",
  "Stripe API": "stripe", "Support SaaS API": "salesforce",
};

export function IntegrationsPage({ nav }: { nav: (r: string) => void }) {
  const s = useAppState();
  const statuses = CONNECTIONS.map(statusOf);
  const enforced = statuses.filter((x) => x === "ENFORCED").length;
  const degraded = statuses.filter((x) => x === "DEGRADED").length;
  const understood = statuses.filter((x) => x === "UNDERSTOOD_ONLY").length;
  const used = (c: Connection) => s.events.filter(c.uses).length;

  // A real identity chain: the latest recorded action on the checkout code (the root), else the latest action.
  const byTime = [...s.events].sort((a, b) => b.timestamp - a.timestamp);
  const sample = byTime.find((e) => /checkout/i.test(names(e).resource)) ?? byTime[0];

  // Identity nodes — same values shown before, now logo-forward.
  const throughVal = sample ? (sample.application ?? sample.plane.toLowerCase()) : "";
  const throughLogo = sample?.application ? APP_LOGO[sample.application] : undefined;
  const chain = sample
    ? [
        { label: "User", value: userById(sample.user)?.name ?? sample.user,
          mark: <Avatar userId={sample.user} size={22} /> },
        { label: "Device", value: deviceById(sample.device)?.name ?? sample.device,
          mark: <Laptop size={16} style={{ color: "var(--fg-3)" }} /> },
        { label: "Agent", value: names(sample).agent,
          mark: <AgentMark agentId={sample.agent} size={18} /> },
        { label: "Through", value: throughVal,
          mark: throughLogo
            ? <img src={logoUrl(throughLogo)} alt="" className="logo-img" style={{ width: 18, height: 18 }} />
            : <Plug size={16} style={{ color: "var(--fg-3)" }} /> },
        { label: "On", value: names(sample).resource,
          mark: <img src={logoUrl(resLogo(resourceById(sample.resource)))} alt="" className="logo-img" style={{ width: 18, height: 18 }} /> },
        ...(sample.destination
          ? [{ label: "To", value: names(sample).destination ?? sample.destination,
              mark: <DestMark destId={sample.destination} size={18} /> }]
          : []),
      ]
    : [];

  return (
    <div className="page page-wide">
      <PageHead
        eyebrow="System"
        title="Integrations"
        sub="The places Wrapbox sits to see and stop agent actions. Each status comes from the capability list Coverage uses; each count comes from your recorded actions."
        right={<SimNote>All connections simulated</SimNote>}
      />

      {/* Enforcement posture — a slim refined strip, not a wall of number boxes */}
      <div className="card" style={{ padding: "16px 22px" }}>
        <MetricBar
          band
          items={[
            { label: "Connections", value: CONNECTIONS.length, note: `plus Okta SSO · ${USERS.length} users` },
            { label: "Enforced", value: enforced, tone: "good", note: "can stop actions inline", onClick: () => nav("coverage") },
            { label: "Degraded", value: degraded, tone: degraded > 0 ? "warn" : "good", note: "some parts only watched", onClick: () => nav("coverage") },
            { label: "Understood only", value: understood, tone: understood > 0 ? "info" : "good", note: "watched, can't stop yet", onClick: () => nav("coverage") },
          ]}
        />
      </div>

      <PageTabs storageKey="integrations" tabs={[
        {
          id: "connections",
          label: "Connected systems",
          count: CONNECTIONS.length,
          content: CONNECTIONS.length === 0 ? (
            <div className="card empty">No connections configured yet.</div>
          ) : (
            // The connections themselves, logo-forward. Enforcement tallies live in the
            // MetricBar above, so this tab opens straight onto the cards.
            <div className="grid g2">
              {CONNECTIONS.map((c, i) => (
                <div className="card" key={c.name} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="spread" style={{ alignItems: "flex-start" }}>
                    <span className="row" style={{ gap: 12, flexWrap: "nowrap", minWidth: 0 }}>
                      <span className="plane-icon" style={{ width: 40, height: 40, borderRadius: 11 }}>
                        <img src={logoUrl(c.logo)} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.01em" }}>{c.name}</span>
                        <span className="small faint">{c.kind}</span>
                      </span>
                    </span>
                    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                      <StatusChip s={statuses[i]} />
                      <span className="row" style={{ gap: 6, flexWrap: "nowrap" }} title="Recorded actions routed through this connection">
                        <span className="small faint">Recorded actions</span>
                        <span className="mono" style={{ fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>{used(c)}</span>
                      </span>
                    </span>
                  </div>

                  <div className="small dim" style={{ lineHeight: 1.5 }}>{c.detail}</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 9, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                    {c.caps.map(capOf).map((cap) => (
                      <div key={cap.id} className="row" style={{ gap: 9, flexWrap: "nowrap", alignItems: "baseline" }}>
                        <StatusChip s={cap.status} />
                        <span style={{ minWidth: 0 }}>
                          <span className="small" style={{ fontWeight: 550 }}>{cap.label}</span>
                          <span className="small faint"> — {cap.note}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: "identity",
          label: "Identity model",
          content: !sample ? (
            <div className="card empty">No actions recorded yet — run one in the Simulation Lab.</div>
          ) : (
            <>
              {/* The who/what/through/on chain from a real action */}
              <SectionHead title="Identity model" sub="Who, on which laptop, with which agent, through what, on what — taken from a real recorded action" />
              <div className="card">
                <div className="spread" style={{ marginBottom: 16, gap: 10 }}>
                  <span className="row" style={{ gap: 10, minWidth: 0 }}>
                    <DecisionChip d={sample.decision} />
                    <span className="small" style={{ fontWeight: 550 }}>{describe(sample)}</span>
                  </span>
                  <span className="faint mono small">{sample.id}</span>
                </div>

                <div className="row" style={{ gap: 0, rowGap: 12 }}>
                  {chain.map((nd, idx) => (
                    <span key={nd.label} className="row" style={{ gap: 0, flexWrap: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 9,
                          padding: "8px 13px", borderRadius: 10,
                          border: "1px solid var(--line)", background: "var(--surface-2)",
                        }}
                      >
                        {nd.mark}
                        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
                          <span className="faint" style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{nd.label}</span>
                          <span className="small" style={{ fontWeight: 550 }}>{nd.value}</span>
                        </span>
                      </span>
                      {idx < chain.length - 1 && (
                        <span style={{ color: "var(--fg-4)", padding: "0 6px", display: "inline-flex" }}><ArrowRight size={14} /></span>
                      )}
                    </span>
                  ))}
                </div>

                <div className="small dim" style={{ marginTop: 18, lineHeight: 1.55, display: "flex", gap: 8 }}>
                  <Fingerprint size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    User (from Okta SSO, simulated) + device + agent + tool + resource flow into every decision and
                    every evidence record. “Traffic came from Chrome” is never an identity.
                  </span>
                </div>
              </div>
            </>
          ),
        },
        {
          id: "resources",
          label: "Governed resources",
          count: RESOURCES.length,
          content: RESOURCES.length === 0 ? (
            <div className="card empty">No governed resources defined yet.</div>
          ) : (
            <>
              <SectionHead title="Governed resources" sub="The systems policy is written against, with environment and sensitivity" />
              <div className="card card-pad-0">
                <table className="tbl">
                  <thead><tr><th>Resource</th><th>Kind</th><th>Environment</th><th>Sensitivity</th><th>Detail</th></tr></thead>
                  <tbody>
                    {RESOURCES.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                            <img src={logoUrl(resLogo(r))} alt="" className="logo-img" style={{ width: 18, height: 18 }} />
                            <b className="small">{r.name}</b>
                          </span>
                        </td>
                        <td><Chip tone="neutral">{r.kind}</Chip></td>
                        <td><Chip tone={r.environment === "production" ? "review" : "neutral"}>{r.environment}</Chip></td>
                        <td><Chip tone={r.sensitivity === "customer-impacting" ? "critical" : r.sensitivity === "sensitive" ? "high" : "neutral"}>{r.sensitivity}</Chip></td>
                        <td className="small dim">{r.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ),
        },
        {
          id: "ontology",
          label: "Action ontology",
          count: ACTION_NORMALIZATION.length,
          content: ACTION_NORMALIZATION.length === 0 ? (
            <div className="card empty">No action normalizations registered yet.</div>
          ) : (
            <>
              {/* One verb, many mechanisms */}
              <SectionHead title="Action Ontology — normalization" sub="Different mechanisms normalize to one semantic verb, so policy is written once" />
              <div className="card card-pad-0">
                <table className="tbl">
                  <thead><tr><th>Raw mechanism</th><th>Via</th><th>Normalized verb</th></tr></thead>
                  <tbody>
                    {ACTION_NORMALIZATION.map((a) => (
                      <tr key={a.raw}>
                        <td className="mono small">{a.raw}</td>
                        <td><Chip tone="neutral">{a.via}</Chip></td>
                        <td>
                          <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                            <span style={{ color: "var(--fg-4)", display: "inline-flex" }}><ArrowRight size={13} /></span>
                            <Chip tone="constrain">{a.verb}</Chip>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="small faint row" style={{ gap: 6, marginTop: 12 }}>
                <Shuffle size={13} />
                Policy is written once against the verb. See it applied live in the{" "}
                <a onClick={() => nav("simlab")}>Simulation Lab</a>
                <ArrowRight size={12} />
              </div>
            </>
          ),
        },
      ]} />
    </div>
  );
}
