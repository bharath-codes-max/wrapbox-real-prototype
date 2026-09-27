// A video-tour layout for one long TourCase, on the same 1600×900 stage the
// v2/v3 decks use. Not a use-case slide: the live product fills the stage, one
// caption strip sits over the bottom, a proper timeline scrubs steps, and the
// side rail collapses to chapters so a 74-step tour reads like a video, not a
// checklist. Voice, keyboard shortcuts and message posting are unchanged, so
// this reuses the same tour.html player as the decks.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX, Menu, X, Check } from "lucide-react";
import type { SlideProps } from "./deck";
import { SHOT } from "./ui";
import { photoOf } from "../ui/logos";
import type { TourCase } from "../tour/types";

// The stage is 1600×900; leave a comfortable top eyebrow and bottom caption.
const APP_W = 1600, APP_H = 900;
const FRAME_W = 1600, FRAME_H = 792;
const SCALE = FRAME_H / APP_H;

const VOICE_KEY = "wrapbox-deck-voice";
function readVoicePref(): boolean { try { return localStorage.getItem(VOICE_KEY) !== "0"; } catch { return true; } }

interface TourMsg { type: "wrapbox-tour"; id: string; step: number; total: number; status: string; error?: string; route?: string; voiceBlocked?: boolean }

// Group the 74 steps into 12 chapters by title cue. Data, not code: adding a
// step doesn't require updating this; anything not in a chapter falls into the
// preceding one.
const CHAPTERS: { at: number; label: string }[] = [
  { at: 0, label: "Welcome" },
  { at: 3, label: "Protect data" },
  { at: 9, label: "On the laptop" },
  { at: 12, label: "Context decides" },
  { at: 17, label: "Safety Kernel" },
  { at: 19, label: "Intent Studio" },
  { at: 22, label: "Policy Simulator" },
  { at: 23, label: "Task + Review" },
  { at: 30, label: "Standing & Break Glass" },
  { at: 32, label: "MCP tool control" },
  { at: 38, label: "Injection-aware" },
  { at: 42, label: "Delegation" },
  { at: 45, label: "Supplier contracts" },
  { at: 47, label: "Output check" },
  { at: 51, label: "Browser + cloud" },
  { at: 56, label: "Kill switch" },
  { at: 64, label: "Trust & Coverage" },
  { at: 66, label: "Vault & Evidence" },
  { at: 70, label: "Integrations" },
  { at: 72, label: "That's Wrapbox" },
];

// The app's own route names, as they appear over the top bar.
const PAGE: Record<string, string> = {
  start: "Get started", control: "Control Room", live: "Live Actions", agents: "Agents", tasks: "Tasks",
  intent: "Intent Studio", safety: "Safety Kernel", simulator: "Policy Simulator", reviews: "Review Center",
  standing: "Standing Permissions", breakglass: "Break Glass", coverage: "Coverage Map", trust: "Trust Graph",
  evidence: "Evidence", simlab: "Simulation Lab", integrations: "Integrations", vault: "Token Vault",
  brain: "Core Brain", settings: "Settings", onboarding: "Setup",
};
const pageOf = (route: string) => PAGE[route.split("/")[0]] ?? "Wrapbox";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function VideoTour({ tc, active }: { tc: TourCase } & SlideProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [run, setRun] = useState({ key: 0, from: 0 });
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("loading");
  const [route, setRoute] = useState(tc.start);
  const [voice, setVoice] = useState(readVoicePref);
  const [voiceBlocked, setVoiceBlocked] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const total = tc.steps.length;

  useEffect(() => {
    const on = (e: MessageEvent) => {
      const d = e.data as TourMsg | null;
      if (!d || d.type !== "wrapbox-tour" || d.id !== tc.id || e.source !== frame.current?.contentWindow) return;
      if (d.route) setRoute(d.route);
      if (typeof d.voiceBlocked === "boolean") setVoiceBlocked(d.voiceBlocked);
      if (SHOT) return;
      setStep(d.step); setStatus(d.status);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [tc.id]);

  const send = useCallback((cmd: string) => frame.current?.contentWindow?.postMessage({ type: "wrapbox-tour-cmd", cmd }, "*"), []);
  const restartAt = useCallback((i: number) => { setStep(i); setStatus("loading"); setRun((r) => ({ key: r.key + 1, from: Math.min(Math.max(0, i), total - 1) })); }, [total]);
  const toggleVoice = useCallback(() => {
    const on = voiceBlocked ? true : !voice;
    setVoice(on); setVoiceBlocked(false);
    try { localStorage.setItem(VOICE_KEY, on ? "1" : "0"); } catch { /* private mode */ }
    send(on ? "voice-on" : "voice-off");
  }, [voice, voiceBlocked, send]);

  // P play/pause, M sound, ← / → previous / next step. Keys inside the iframe
  // arrive as messages, so this covers both surfaces.
  useEffect(() => {
    const act = (k: string) => {
      if (k === "p" || k === "P" || k === " ") send("toggle");
      if (k === "m" || k === "M") toggleVoice();
      if (k === "ArrowRight") restartAt(Math.min(total - 1, step + 1));
      if (k === "ArrowLeft") restartAt(Math.max(0, step - 1));
    };
    const on = (e: KeyboardEvent) => act(e.key);
    const onMsg = (e: MessageEvent) => { const d = e.data as { type?: string; key?: string } | null; if (d?.type === "wrapbox-tour-key" && d.key) act(d.key); };
    window.addEventListener("keydown", on); window.addEventListener("message", onMsg);
    return () => { window.removeEventListener("keydown", on); window.removeEventListener("message", onMsg); };
  }, [send, toggleVoice, restartAt, step, total]);

  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const src = useMemo(() => SHOT
    ? `tour.html?case=${tc.id}&shot=${Math.min(tc.poster ?? 1, total - 1)}&after=1&nocap=1`
    : `tour.html?case=${tc.id}&voice=${voiceRef.current ? 1 : 0}&nocap=1${run.from ? `&from=${run.from}` : ""}`,
  [tc.id, run, total]);
  const done = status === "done" && !SHOT;
  const paused = status === "paused";
  const cur = tc.steps[step];

  // Elapsed time from the manifest — the manifest is loaded by the iframe, so
  // here we approximate with per-step averages (~11s each) for the scrubber.
  const AVG = 11;
  const elapsed = step * AVG;
  const totalSec = total * AVG;
  const progressPct = Math.min(100, (step / Math.max(1, total - 1)) * 100);

  const currentChapter = [...CHAPTERS].reverse().find((c) => step >= c.at) ?? CHAPTERS[0];
  const person = tc.persona;
  const face = photoOf(person.userId);
  const initials = person.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="vt">
      {/* Top eyebrow: title, current page, live pill, chapter chip, guide chip */}
      <div className="vt-top">
        <div className="vt-title">
          <span className="vt-mark">▶</span>
          <b>{tc.title}</b>
        </div>
        <div className="vt-mid">
          <span className="vt-page"><span className="lights"><i /><i /><i /></span>Wrapbox · {pageOf(route)}</span>
          <span className="vt-chip vt-chap" onClick={() => setChaptersOpen((v) => !v)} title="Chapters">
            <Menu size={13} /> {currentChapter.label}
          </span>
        </div>
        <div className="vt-guide">
          {face ? <img src={face} alt="" /> : <span className="vt-face-mono">{initials}</span>}
          <span>Guided by <b>{person.name}</b></span>
        </div>
      </div>

      {/* Big video frame — the live product fills the stage */}
      <div className="vt-stage" style={{ width: FRAME_W * SCALE + 0, height: FRAME_H * SCALE + 0 }}>
        {active && (
          <iframe
            key={run.key}
            ref={frame}
            src={src}
            title={`${tc.title} — live tour`}
            width={APP_W}
            height={APP_H}
            allow="autoplay"
            style={{ transform: `scale(${(FRAME_W * SCALE) / APP_W})` }}
            tabIndex={-1}
          />
        )}
        <div className="vt-live"><i /> LIVE</div>

        {/* Caption strip over the bottom of the video */}
        <div className={`vt-cap ${done ? "cap-done" : ""}`}>
          <div className="cap-meta">
            <span className="cap-step">Step {Math.min(step + 1, total)} of {total}</span>
            <span className="cap-sep">·</span>
            <span className="cap-chap">{currentChapter.label}</span>
          </div>
          <h2 className="cap-title">{done ? "That's Wrapbox" : cur?.title}</h2>
          <p className="cap-body">{done ? tc.outcome : cur?.body}</p>
        </div>

        {/* Chapter overlay (closed by default) */}
        {chaptersOpen && (
          <div className="vt-chapters" onClick={() => setChaptersOpen(false)}>
            <div className="vt-chapters-inner" onClick={(e) => e.stopPropagation()}>
              <div className="vt-chapters-head">
                <span>Chapters</span>
                <button onClick={() => setChaptersOpen(false)} aria-label="Close"><X size={14} /></button>
              </div>
              <ol className="vt-chapters-list">
                {CHAPTERS.map((c, i) => {
                  const isCur = c.label === currentChapter.label;
                  const past = step >= (CHAPTERS[i + 1]?.at ?? total);
                  return (
                    <li key={c.label} className={`${isCur ? "cur" : ""} ${past ? "past" : ""}`} onClick={() => { restartAt(c.at); setChaptersOpen(false); }}>
                      <span className="vt-chapters-no">{past ? <Check size={11} strokeWidth={3} /> : (i + 1).toString().padStart(2, "0")}</span>
                      <span className="vt-chapters-lb">{c.label}</span>
                      <span className="vt-chapters-t">{fmt(c.at * AVG)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Real video-player timeline: scrubber, times, transport, voice */}
      <div className="vt-scrub">
        <div className="vt-track" onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - r.left) / r.width;
          restartAt(Math.round(pct * (total - 1)));
        }}>
          <div className="vt-bar" style={{ width: `${progressPct}%` }} />
          {CHAPTERS.slice(1).map((c) => (
            <span key={c.label} className="vt-mark-tick" style={{ left: `${(c.at / (total - 1)) * 100}%` }} title={c.label} />
          ))}
          <span className="vt-thumb" style={{ left: `${progressPct}%` }} />
        </div>
        <div className="vt-time">{fmt(elapsed)} <span className="vt-time-sep">/</span> {fmt(totalSec)}</div>
      </div>

      <div className="vt-transport">
        <div className="vt-transport-l">
          <button className="vt-t-btn" onClick={() => restartAt(0)} title="Restart"><RotateCcw size={16} /></button>
          <button className="vt-t-btn" onClick={() => restartAt(Math.max(0, step - 1))} title="Previous step (←)"><SkipBack size={16} /></button>
          <button className="vt-t-play" onClick={() => (done ? restartAt(0) : send("toggle"))} title="Play / pause (P, space)">
            {done ? <RotateCcw size={20} /> : paused || status === "loading" ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button className="vt-t-btn" onClick={() => restartAt(Math.min(total - 1, step + 1))} title="Next step (→)"><SkipForward size={16} /></button>
        </div>
        <div className="vt-transport-r">
          <button className={`vt-voice ${voice && voiceBlocked ? "ask" : ""}`} onClick={toggleVoice} title={voice ? "Narration on — AI voice (M)" : "Narration off (M)"}>
            {voice && !voiceBlocked ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{voice && voiceBlocked ? "Tap for voice" : voice ? "Voice on" : "Voice off"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
