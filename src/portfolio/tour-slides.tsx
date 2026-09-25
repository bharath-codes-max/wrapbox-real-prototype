// v2 use cases — each one plays inside the real Wrapbox product. The left frame
// is the actual app (tour.html) running a walkthrough: a cursor, typing and
// clicks through the product's own screens, pausing on a spotlight with a
// plain-language card. The right column follows along step by step.
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Check } from "lucide-react";
import type { SlideProps } from "./deck";
import { Reveal, Eyebrow, Display, Lead, SHOT } from "./ui";
import { photoOf } from "../ui/logos";
import { CASES } from "../tour/cases";
import type { TourCase } from "../tour/types";

const APP_W = 1280, APP_H = 800, SCALE = 0.86;

function Face({ userId, name, size = 40 }: { userId: string; name: string; size?: number }) {
  const src = photoOf(userId);
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  return src
    ? <img className="lvface" style={{ width: size, height: size }} src={src} alt="" />
    : <span className="lvface lvface-mono" style={{ width: size, height: size }}>{initials}</span>;
}

/* ---------- intro ---------- */
export function LiveIntro() {
  const roles = [...new Set(CASES.map((c) => c.persona.role))];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 22 }}>
      <div>
        <Reveal><Eyebrow>Use cases · played live in the product</Eyebrow></Reveal>
        <Reveal i={1}><Display sm>{CASES.length} jobs, played live in the real product.</Display></Reveal>
        <Reveal i={2}><Lead style={{ fontSize: 20, marginTop: 12, maxWidth: 1240 }}>Each slide runs the actual Wrapbox app. A cursor does what the person would do, and at every important moment it pauses, lights up that part of the screen and explains it in plain words. Press <b>P</b> to pause; click any step to jump to it.</Lead></Reveal>
      </div>
      <div className="lvroles">
        {roles.map((role, k) => (
          <Reveal key={role} i={3 + k * 0.3} className="lvrole">
            <div className="lvrole-h">{role}</div>
            {CASES.filter((c) => c.persona.role === role).map((c) => (
              <div key={c.id} className="lvrole-c">
                <Face userId={c.persona.userId} name={c.persona.name} size={26} />
                <span>{c.title}</span>
                <b>{String(CASES.indexOf(c) + 1).padStart(2, "0")}</b>
              </div>
            ))}
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ---------- one live case ---------- */
interface TourMsg { type: "wrapbox-tour"; id: string; step: number; total: number; status: string; error?: string; route?: string }

// The page the app is on, by its name in the product's own navigation.
const PAGE: Record<string, string> = {
  start: "Get started", control: "Control Room", live: "Live Actions", agents: "Agents", tasks: "Tasks",
  intent: "Intent Studio", safety: "Safety Kernel", simulator: "Policy Simulator", reviews: "Review Center",
  standing: "Standing Permissions", breakglass: "Break Glass", coverage: "Coverage Map", trust: "Trust Graph",
  evidence: "Evidence", simlab: "Simulation Lab", integrations: "Integrations", vault: "Token Vault",
  brain: "Core Brain", settings: "Settings", onboarding: "Setup",
};
const pageOf = (route: string) => PAGE[route.split("/")[0]] ?? "Wrapbox";

export function LiveCaseSlide({ tc, n, active }: { tc: TourCase; n: number } & SlideProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [run, setRun] = useState({ key: 0, from: 0 });
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState<string | undefined>();
  const [route, setRoute] = useState(tc.start);
  const total = tc.steps.length;
  const poster = Math.min(tc.poster ?? 1, total - 1);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      const d = e.data as TourMsg | null;
      if (!d || d.type !== "wrapbox-tour" || d.id !== tc.id || e.source !== frame.current?.contentWindow) return;
      setStep(d.step); setStatus(d.status); setError(d.error); if (d.route) setRoute(d.route);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [tc.id]);

  const send = useCallback((cmd: string) => frame.current?.contentWindow?.postMessage({ type: "wrapbox-tour-cmd", cmd }, "*"), []);
  const restartAt = useCallback((i: number) => { setStep(i); setStatus("loading"); setError(undefined); setRun((r) => ({ key: r.key + 1, from: Math.min(Math.max(0, i), total - 1) })); }, [total]);

  // P pauses / resumes — typed here or inside the app frame.
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "p" || e.key === "P") send("toggle"); };
    const onMsg = (e: MessageEvent) => { const d = e.data as { type?: string; key?: string } | null; if (d?.type === "wrapbox-tour-key" && (d.key === "p" || d.key === "P")) send("toggle"); };
    window.addEventListener("keydown", on); window.addEventListener("message", onMsg);
    return () => { window.removeEventListener("keydown", on); window.removeEventListener("message", onMsg); };
  }, [send]);

  const src = SHOT
    ? `tour.html?case=${tc.id}&shot=${poster}&after=1`
    : `tour.html?case=${tc.id}${run.from ? `&from=${run.from}` : ""}`;
  const shownStep = SHOT ? poster : step;
  const done = status === "done" && !SHOT;
  const paused = status === "paused";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="lvhead">
        <Reveal><Eyebrow>Live use case {String(n).padStart(2, "0")} · {tc.persona.role}</Eyebrow></Reveal>
        <Reveal i={1}><h1 className="lvtitle">{tc.title}</h1></Reveal>
      </div>
      <div className="lvbody">
        <Reveal i={2} className="lvframe" style={{ width: APP_W * SCALE }}>
          <div className="lvbar">
            <span className="lights"><i /><i /><i /></span>
            <span className="lvurl">Wrapbox · {pageOf(SHOT ? (tc.steps.slice(0, poster + 1).reverse().find((s) => s.route)?.route ?? tc.start) : route)}</span>
            <span className="lvlive"><i />Running live</span>
          </div>
          <div className="lvview" style={{ width: APP_W * SCALE, height: APP_H * SCALE }}>
            {active && (
              <iframe
                key={run.key}
                ref={frame}
                src={src}
                title={`${tc.title} — live walkthrough`}
                width={APP_W}
                height={APP_H}
                style={{ transform: `scale(${SCALE})` }}
                tabIndex={-1}
              />
            )}
          </div>
        </Reveal>
        <Reveal i={3} className="lvside">
          <div className="lvwho">
            <Face userId={tc.persona.userId} name={tc.persona.name} size={44} />
            <div><b>{tc.persona.name}</b><span>{tc.persona.role}</span></div>
          </div>
          <div className="lvgoal"><span className="label">Why they're here</span><p>{tc.goal}</p></div>
          <ol className="lvsteps">
            {tc.steps.map((s, i) => {
              const cur = i === shownStep && !done;
              const past = i < shownStep || done;
              return (
                <li key={i} className={`${cur ? "cur" : ""} ${past ? "done" : ""}`} onClick={() => restartAt(i)} title="Play from this step">
                  <span className="lvn">{past ? <Check size={12} strokeWidth={3} /> : i + 1}</span>
                  <span className="lvst"><b>{s.title}</b></span>
                </li>
              );
            })}
          </ol>
          {done && <div className="lvout"><span className="label">What they got</span><p>{tc.outcome}</p></div>}
          {error && <div className="lverr">{error}</div>}
          <div className="lvctl">
            <button onClick={() => restartAt(0)} title="Restart"><RotateCcw size={15} /></button>
            <button onClick={() => restartAt(Math.max(0, shownStep - 1))} title="Previous step"><SkipBack size={15} /></button>
            <button className="main" onClick={() => (done ? restartAt(0) : send("toggle"))} title="Play / pause (P)">
              {done ? <><RotateCcw size={15} /> Replay</> : paused ? <><Play size={15} /> Play</> : <><Pause size={15} /> Pause</>}
            </button>
            <button onClick={() => restartAt(Math.min(total - 1, shownStep + 1))} title="Next step"><SkipForward size={15} /></button>
            <span className="lvprog">{Math.min(shownStep + 1, total)} / {total}</span>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
