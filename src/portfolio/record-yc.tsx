// The 3-minute YC product-demo recording frame (1920×1080, dark theme).
// Fills the full frame — a title card eases in and out, the live product sits
// edge to edge under a thin top progress line, and a wordmark pins to the
// bottom-right so every frame of the recording is unmistakably Wrapbox.
import { useEffect, useRef, useState } from "react";
import { WrapboxLogo, WrapboxWordmark } from "../ui/logo";
import type { TourCase } from "../tour/types";

const VIEW_W = 1920, VIEW_H = 1080;
// The product renders at its native width and scales up — a 2× device pixel
// ratio in the recorder keeps text crisp at this scale.
const APP_W = 1600, APP_H = 900;
const SCALE = VIEW_W / APP_W;

interface TourMsg { type: "wrapbox-tour"; id: string; step: number; status: string; narrated?: number; at?: number }
type Rec = (ev: Record<string, unknown>) => void;

export function RecordYc({ tc }: { tc: TourCase }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [go, setGo] = useState(false);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("loading");
  const total = tc.steps.length;

  // The recorder starts capture, then calls window.__wbGo() so the title card
  // and the first narration frame are both inside the file.
  useEffect(() => { (window as unknown as { __wbGo: () => void }).__wbGo = () => setGo(true); }, []);
  // Title fades on a timer, not on the first narration event, so a slow iframe
  // start can't leave the title stuck on the recorded frame for tens of seconds.
  useEffect(() => { if (!go) return; const t = window.setTimeout(() => setStarted(true), 2600); return () => window.clearTimeout(t); }, [go]);

  useEffect(() => {
    const rec = (window as unknown as { __wbRec?: Rec }).__wbRec;
    const on = (e: MessageEvent) => {
      const d = e.data as TourMsg | null;
      if (!d || d.type !== "wrapbox-tour" || d.id !== tc.id || e.source !== frame.current?.contentWindow) return;
      if (typeof d.narrated === "number") { setStarted(true); rec?.({ narrated: d.narrated, at: d.at }); }
      setStep(d.step); setStatus(d.status);
      if (d.status === "done") rec?.({ done: Date.now() });
      if (d.status === "error") rec?.({ error: d.step });
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [tc.id]);

  const done = status === "done";
  const pct = done ? 100 : (step / Math.max(1, total - 1)) * 100;

  return (
    <div className="rvy">
      <div className="rvy-view" style={{ width: VIEW_W, height: VIEW_H }}>
        {go && (
          <iframe
            ref={frame}
            src={`tour-v2.html?case=${tc.id}&voice=0&nocap=1&dark=1&speed=0.78`}
            title={tc.title}
            width={APP_W}
            height={APP_H}
            style={{ transform: `scale(${SCALE})` }}
            tabIndex={-1}
          />
        )}

        {/* A thin top progress line — the only live chrome on top of the product. */}
        <div className="rvy-prog" style={{ opacity: started && !done ? 1 : 0 }}>
          <i style={{ width: `${pct}%` }} />
        </div>

        {/* A tiny wordmark pinned to the bottom-right. Stays after the title fades. */}
        <div className="rvy-mark" style={{ opacity: started ? 1 : 0 }}>
          <WrapboxWordmark tone="dark" height={22} />
        </div>

        {/* Opening title card — spells the category in frame one so the viewer never
            has to guess what Wrapbox is. */}
        <div className={`rvy-title ${started ? "rvy-title-out" : ""}`}>
          <div className="rvy-eyebrow">THE AGENTIC SECURITY RUNTIME</div>
          <div className="rvy-logo"><WrapboxLogo size={128} tone="dark" /></div>
          <h1>Wrapbox decides<br />what every AI agent is allowed to do.</h1>
          <p>Not EDR. Not MDM. A single decision engine between every agent and every action — on the device, over the network, at the gateway.</p>
          <div className="rvy-personas">
            <span>Priya · Admin</span><i /><span>Daniel · Developer</span><i /><span>Alex · Engineering Manager</span><i /><span>Sam · Security</span>
          </div>
          <div className="rvy-sub">A LIVE WALKTHROUGH OF THE REAL PRODUCT</div>
        </div>

        {/* Closing card, same frame, fades in at the end. */}
        <div className={`rvy-end ${done ? "rvy-end-in" : ""}`}>
          <div className="rvy-logo"><WrapboxLogo size={128} tone="dark" /></div>
          <h1>Wrapbox.</h1>
          <p>The agentic security runtime. Device, Network, Gateway — one brain, every action on record.</p>
          <div className="rvy-sub">WRAPBOX.AI</div>
        </div>
      </div>
    </div>
  );
}
