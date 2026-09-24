import { useEffect, useState } from "react";
import {
  Bot, BrainCircuit, CirclePlay, FileCheck2, FlaskConical, Hand, KeyRound,
  LayoutGrid, ListChecks, ListTree, Play, Plug, ScrollText, Settings as SettingsIcon,
  ShieldCheck, Siren, Table2, Timer, Waypoints, type LucideIcon,
} from "lucide-react";
import { useAppState, metrics } from "./state/store";
import { logoUrl } from "./ui/logos";
import { ControlRoom } from "./pages/control-room";
import { LiveActions } from "./pages/live-actions";
import { AgentsPage } from "./pages/agents";
import { TasksPage } from "./pages/tasks";
import { IntentStudio } from "./pages/intent-studio";
import { SafetyKernelPage } from "./pages/safety-kernel";
import { PolicySimulator } from "./pages/policy-simulator";
import { ReviewCenter } from "./pages/review-center";
import { StandingPage } from "./pages/standing";
import { BreakGlassPage } from "./pages/break-glass";
import { CoverageMap } from "./pages/coverage";
import { TrustGraph } from "./pages/trust-graph";
import { EvidenceExplorer } from "./pages/evidence";
import { SimulationLab } from "./pages/sim-lab";
import { IntegrationsPage } from "./pages/integrations";
import { TokenVaultPage } from "./pages/token-vault";
import { CoreBrainPage } from "./pages/core-brain";
import { SettingsPage } from "./pages/settings";
import { DemoBar, DEMO_SCRIPT } from "./pages/demo";

export type Route = string; // "control" | "live" | ... | "simlab/network"

const NAV: { group: string; items: { route: string; label: string; icon: LucideIcon }[] }[] = [
  { group: "Overview", items: [{ route: "control", label: "Control Room", icon: LayoutGrid }] },
  {
    group: "Activity",
    items: [
      { route: "live", label: "Live Actions", icon: ListTree },
      { route: "agents", label: "Agents", icon: Bot },
      { route: "tasks", label: "Tasks", icon: ListChecks },
    ],
  },
  {
    group: "Policy",
    items: [
      { route: "intent", label: "Intent Studio", icon: FileCheck2 },
      { route: "safety", label: "Safety Kernel", icon: ShieldCheck },
      { route: "simulator", label: "Policy Simulator", icon: FlaskConical },
    ],
  },
  {
    group: "Authorization",
    items: [
      { route: "reviews", label: "Review Center", icon: Hand },
      { route: "standing", label: "Standing Permissions", icon: Timer },
      { route: "breakglass", label: "Break Glass", icon: Siren },
    ],
  },
  {
    group: "Visibility",
    items: [
      { route: "coverage", label: "Coverage Map", icon: Table2 },
      { route: "trust", label: "Trust Graph", icon: Waypoints },
      { route: "evidence", label: "Evidence", icon: ScrollText },
    ],
  },
  { group: "Simulation", items: [{ route: "simlab", label: "Simulation Lab", icon: CirclePlay }] },
  {
    group: "System",
    items: [
      { route: "integrations", label: "Integrations", icon: Plug },
      { route: "vault", label: "Token Vault", icon: KeyRound },
      { route: "brain", label: "Core Brain", icon: BrainCircuit },
      { route: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => location.hash.slice(1) || "control");
  useEffect(() => {
    const on = () => setRoute(location.hash.slice(1) || "control");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const nav = (r: Route) => {
    location.hash = r;
    setRoute(r);
  };
  return [route, nav];
}

export function App() {
  const state = useAppState();
  const [route, nav] = useRoute();
  const m = metrics(state);
  const base = route.split("/")[0];
  const demoOn = state.demoStep >= 0;

  const page = (() => {
    switch (base) {
      case "control": return <ControlRoom nav={nav} />;
      case "live": return <LiveActions nav={nav} />;
      case "agents": return <AgentsPage nav={nav} route={route} />;
      case "tasks": return <TasksPage nav={nav} />;
      case "intent": return <IntentStudio nav={nav} route={route} />;
      case "safety": return <SafetyKernelPage nav={nav} />;
      case "simulator": return <PolicySimulator nav={nav} />;
      case "reviews": return <ReviewCenter nav={nav} />;
      case "standing": return <StandingPage nav={nav} />;
      case "breakglass": return <BreakGlassPage nav={nav} />;
      case "coverage": return <CoverageMap nav={nav} />;
      case "trust": return <TrustGraph nav={nav} />;
      case "evidence": return <EvidenceExplorer nav={nav} route={route} />;
      case "simlab": return <SimulationLab nav={nav} route={route} />;
      case "integrations": return <IntegrationsPage nav={nav} />;
      case "vault": return <TokenVaultPage nav={nav} />;
      case "brain": return <CoreBrainPage nav={nav} />;
      case "settings": return <SettingsPage nav={nav} />;
      default: return <ControlRoom nav={nav} />;
    }
  })();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <img src={logoUrl("wrapbox-mark")} alt="Wrapbox" />
          </div>
          <div>
            <div className="brand-name">Wrapbox</div>
            <div className="faint" style={{ fontSize: 10 }}>Veridian Systems</div>
          </div>
        </div>
        <div className="brand-env">DEMO ENVIRONMENT</div>
        {NAV.map((g) => (
          <div className="nav-group" key={g.group}>
            <div className="nav-group-label">{g.group}</div>
            {g.items.map((it) => (
              <button
                key={it.route}
                className={`nav-item ${base === it.route ? "active" : ""}`}
                onClick={() => nav(it.route)}
              >
                <it.icon />
                {it.label}
                {it.route === "reviews" && m.pendingReviews > 0 && (
                  <span className="badge-count">{m.pendingReviews}</span>
                )}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          {!demoOn && (
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => DEMO_SCRIPT.start(nav)}>
              <Play size={13} /> Demo Mode
            </button>
          )}
          <div className="faint" style={{ fontSize: 10, marginTop: 8 }}>
            Wrapbox Real Prototype · all integrations simulated · product behavior live
          </div>
        </div>
      </aside>
      <main className="main" style={demoOn ? { paddingBottom: 90 } : undefined}>
        {page}
      </main>
      {demoOn && <DemoBar nav={nav} />}
    </div>
  );
}
