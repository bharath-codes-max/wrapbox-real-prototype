// A video-tour layout for one long TourCase, on the same 1600×900 stage the
// v2/v3 decks use. The live product fills a 16:9 frame; the caption sits in a
// bar BELOW the video (never over the app); a real timeline scrubs steps with
// timecodes taken from the narration clips' actual lengths; the side rail is
// replaced by a chapters drawer. Dark, square-cornered chrome — the same look
// as the v2/v3 deck slides. Reuses the same tour.html player (nocap=1 hides
// the player's own floating caption; the spotlight and cursor still animate).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX, Menu, X, Check, ChevronLeft, ChevronRight, RotateCw, Lock, Plus } from "lucide-react";
import type { SlideProps } from "./deck";
import { SHOT } from "./ui";
import { photoOf } from "../ui/logos";
import type { TourCase } from "../tour/types";
import VOICE from "../tour/voice.json";

// The app renders at 16:9 inside the frame; the frame is scaled to fit the
// stage between the top bar and the caption + transport rows.
const APP_W = 1440, APP_H = 810;
const STAGE_H = 596;
const SCALE = STAGE_H / APP_H;
const STAGE_W = Math.round(APP_W * SCALE);

const VOICE_KEY = "wrapbox-deck-voice";
function readVoicePref(): boolean { try { return localStorage.getItem(VOICE_KEY) !== "0"; } catch { return true; } }

interface TourMsg { type: "wrapbox-tour"; id: string; step: number; total: number; status: string; error?: string; route?: string; voiceBlocked?: boolean }

// One chapter per product page, matching the grand tour's step order.
const CHAPTERS: { at: number; label: string }[] = [
  { at: 0, label: "Welcome" },
  { at: 1, label: "Control Room" },
  { at: 4, label: "Live Actions" },
  { at: 7, label: "Agents + kill switch" },
  { at: 15, label: "Tasks" },
  { at: 19, label: "Intent Studio" },
  { at: 22, label: "Safety Kernel" },
  { at: 24, label: "Policy Simulator" },
  { at: 26, label: "Review Center" },
  { at: 30, label: "Standing Permissions" },
  { at: 31, label: "Break Glass" },
  { at: 32, label: "Coverage Map" },
  { at: 34, label: "Trust Graph" },
  { at: 36, label: "Evidence" },
  { at: 39, label: "Simulation Lab" },
  { at: 55, label: "Integrations" },
  { at: 57, label: "Token Vault" },
  { at: 59, label: "Core Brain" },
  { at: 61, label: "Settings + Get started" },
  { at: 63, label: "That's Wrapbox" },
];

// The app's own route names, shown over the top bar.
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

  // Timecodes from the narration manifest; a step whose clip is not recorded
  // yet is estimated from its text, mirroring the player's own silent pacing.
  const clipMs = useMemo(() => {
    const clips = (VOICE as { cases: Record<string, { ms: number }[]> }).cases[tc.id] ?? [];
    return tc.steps.map((st, i) => {
      const ms = clips[i]?.ms ?? 0;
      if (ms > 0) return ms;
      const words = `${st.title} ${st.body}`.split(/\s+/).length;
      return Math.min(9500, Math.max(3400, 1100 + words * 240)) + (st.hold ?? 1400);
    });
  }, [tc]);
  const cum = useMemo(() => {
    const out: number[] = [0];
    for (const ms of clipMs) out.push(out[out.length - 1] + ms);
    return out;
  }, [clipMs]);
  const totalSec = cum[cum.length - 1] / 1000;
  const elapsedSec = cum[Math.min(step, total)] / 1000;
  const progressPct = totalSec > 0 ? Math.min(100, (elapsedSec / totalSec) * 100) : 0;

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

  // P / space play-pause, M sound, ← → previous / next. Keys inside the iframe
  // arrive as messages, so both surfaces work.
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

  const currentChapter = [...CHAPTERS].reverse().find((c) => step >= c.at) ?? CHAPTERS[0];
  const person = tc.persona;
  const face = photoOf(person.userId);
  const initials = person.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");

  return (
    <div className="vt">
      {/* The live product inside a real Chrome-style browser window (dark chrome + drop shadow) */}
      <div className="vt-stage" style={{ width: STAGE_W }}>
        {/* Row 1 — tab strip: mac lights · active tab (favicon + title + close) · new tab */}
        <div className="vt-tabstrip">
          <span className="vt-lights"><i /><i /><i /></span>
          <div className="vt-tab active">
            <span className="vt-fav" />
            <span className="vt-tab-title">Wrapbox — {pageOf(route)}</span>
            <X size={12} className="vt-tab-x" />
          </div>
          <button className="vt-newtab" aria-label="New tab"><Plus size={14} /></button>
        </div>
        {/* Row 2 — toolbar: nav · address bar · chapters · guide */}
        <div className="vt-toolbar">
          <div className="vt-nav">
            <span className="vt-nav-b"><ChevronLeft size={17} /></span>
            <span className="vt-nav-b vt-nav-dim"><ChevronRight size={17} /></span>
            <span className="vt-nav-b"><RotateCw size={15} /></span>
          </div>
          <div className="vt-addr">
            <Lock size={12} className="vt-addr-lock" />
            <span className="vt-addr-host">wrapbox.io</span>
            <span className="vt-addr-path">/{pageOf(route).toLowerCase().replace(/\s+/g, "-")}</span>
            <span className="vt-addr-live"><i /> LIVE</span>
          </div>
          <div className="vt-toolbar-right">
            <button className="vt-chip vt-chap" onClick={() => setChaptersOpen((v) => !v)} title="Chapters">
              <Menu size={13} /> {currentChapter.label}
            </button>
            <span className="vt-guide">
              {face ? <img src={face} alt="" /> : <span className="vt-face-mono">{initials}</span>}
              <b>{person.name}</b>
            </span>
          </div>
        </div>
        <div className="vt-view" style={{ height: STAGE_H }}>
          {active && (
            <iframe
              key={run.key}
              ref={frame}
              src={src}
              title={`${tc.title} — live tour`}
              width={APP_W}
              height={APP_H}
              allow="autoplay"
              style={{ transform: `scale(${SCALE})` }}
              tabIndex={-1}
            />
          )}
        </div>

        {/* Chapters drawer (only when opened) */}
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
                      <span className="vt-chapters-t">{fmt(cum[Math.min(c.at, total)] / 1000)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Caption bar UNDER the video — never covers the app */}
      <div className="vt-capbar" style={{ width: STAGE_W }}>
        <div className="vt-capbar-meta">
          <span className="cap-step">Step {Math.min(step + 1, total)} / {total}</span>
          <span className="cap-chap">{currentChapter.label}</span>
        </div>
        <div className="vt-capbar-text">
          <h2 className="cap-title">{done ? "That's Wrapbox" : cur?.title}</h2>
          <p className="cap-body">{done ? tc.outcome : cur?.body}</p>
        </div>
      </div>

      {/* Timeline with chapter ticks and real timecodes */}
      <div className="vt-scrub" style={{ width: STAGE_W }}>
        <div className="vt-track" onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - r.left) / r.width;
          const targetSec = pct * totalSec;
          let i = 0;
          while (i < total - 1 && cum[i + 1] / 1000 < targetSec) i += 1;
          restartAt(i);
        }}>
          <div className="vt-bar" style={{ width: `${progressPct}%` }} />
          {CHAPTERS.slice(1).map((c) => (
            <span key={c.label} className="vt-mark-tick" style={{ left: `${totalSec > 0 ? (cum[Math.min(c.at, total)] / 1000 / totalSec) * 100 : 0}%` }} title={c.label} />
          ))}
          <span className="vt-thumb" style={{ left: `${progressPct}%` }} />
        </div>
        <div className="vt-time">{fmt(elapsedSec)} <span className="vt-time-sep">/</span> {fmt(totalSec)}</div>
      </div>

      {/* Transport */}
      <div className="vt-transport" style={{ width: STAGE_W }}>
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
