// Deck shell — a 1600×900 stage scaled to the viewport, one slide at a time,
// with keyboard / touch / hash navigation, a segmented progress bar, light and
// dark themes and fullscreen. Slides are React components that receive
// `active` (mounted and shown) and `step` (their internal build step).
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Moon, Sun } from "lucide-react";
import { SLIDES } from "./slides";
import { logoUrl } from "../ui/logos";
import "./deck.css";

export type Tone = "paper" | "mint" | "sky" | "lavender" | "sand" | "rose" | "ink";
export interface SlideProps { active: boolean; step: number }
export interface SlideDef {
  id: string;
  section: string; // header label, e.g. "Problem"
  title: string; // short, for the progress tooltip
  tone: Tone;
  steps?: number; // internal builds before the deck advances (default 1)
  Component: (p: SlideProps) => JSX.Element;
}

const STAGE_W = 1600, STAGE_H = 900, CHROME_H = 56;
const THEME_KEY = "wrapbox-deck-theme";

function readHash(): number {
  const m = location.hash.match(/#\/?(\d+)/);
  const n = m ? parseInt(m[1], 10) - 1 : 0;
  return Math.min(Math.max(0, isNaN(n) ? 0 : n), SLIDES.length - 1);
}

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* private mode */ }
  }, [theme]);
  return [theme, () => setTheme((t) => (t === "dark" ? "light" : "dark"))] as const;
}

function useStageScale(boxRef: React.RefObject<HTMLDivElement>) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => {
      const w = window.innerWidth, h = window.innerHeight - CHROME_H;
      setScale(Math.min(w / STAGE_W, h / STAGE_H));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [boxRef]);
  return scale;
}

export function Deck() {
  const [idx, setIdx] = useState(readHash);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [theme, toggleTheme] = useTheme();
  const [fs, setFs] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const scale = useStageScale(boxRef);
  const slide = SLIDES[idx];
  const steps = slide.steps ?? 1;

  // hash ↔ state
  useEffect(() => { history.replaceState(null, "", `#/${idx + 1}`); document.body.dataset.tone = slide.tone; }, [idx, slide.tone]);
  useEffect(() => {
    const on = () => { const n = readHash(); setDir(n > idx ? 1 : -1); setIdx(n); setStep(0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, [idx]);

  const go = useCallback((n: number) => {
    const t = Math.min(Math.max(0, n), SLIDES.length - 1);
    if (t === idx) return;
    setDir(t > idx ? 1 : -1); setIdx(t); setStep(0);
  }, [idx]);
  const next = useCallback(() => { if (step < steps - 1) setStep(step + 1); else go(idx + 1); }, [step, steps, idx, go]);
  const prev = useCallback(() => { if (step > 0) setStep(step - 1); else go(idx - 1); }, [step, idx, go]);

  // keyboard
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable)) return;
      switch (e.key) {
        case "ArrowRight": case " ": case "PageDown": case "Enter": e.preventDefault(); next(); break;
        case "ArrowLeft": case "PageUp": case "Backspace": e.preventDefault(); prev(); break;
        case "Home": go(0); break;
        case "End": go(SLIDES.length - 1); break;
        case "f": case "F": toggleFullscreen(); break;
        case "t": case "T": toggleTheme(); break;
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [next, prev, go, toggleTheme]);

  // touch swipe
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)();
    touch.current = null;
  };

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  }
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const Cur = slide.Component;
  // ?shot=1 (screenshot capture) renders final states instantly; otherwise follow the OS setting.
  const shot = document.documentElement.dataset.shot === "1";
  return (
    <MotionConfig transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} reducedMotion={shot ? "always" : "user"}>
      <div className="viewport" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="stage-box" ref={boxRef} style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
          {/* The scale lives on a plain wrapper: framer-motion owns `transform` on the section. */}
          <div className="stage-scale" style={{ transform: `scale(${scale})` }}>
            {/* Keyed remount: the new slide slides in from the travel direction; the old one
                is dropped immediately (no exit choreography — robust across browsers). */}
            <motion.section
              key={slide.id}
              className="stage"
              initial={shot ? false : { opacity: 0, x: 56 * dir }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              aria-roledescription="slide"
              aria-label={`${idx + 1} of ${SLIDES.length}: ${slide.title}`}
            >
              <header className="s-head">
                <img src={logoUrl("wrapbox-mark")} alt="" />
                <span className="lbl"><b>Wrapbox</b> · {slide.section}</span>
                <span className="rule" />
                <span className="num">{String(idx + 1).padStart(2, "0")} / {SLIDES.length}</span>
              </header>
              <div className="stage-inner">
                <Cur active step={step} />
              </div>
            </motion.section>
          </div>
        </div>
      </div>

      <footer className="chrome" aria-label="Deck controls">
        <button className="nav" onClick={prev} disabled={idx === 0 && step === 0} aria-label="Previous"><ChevronLeft size={18} /></button>
        <span className="count">{idx + 1} / {SLIDES.length}</span>
        <div className="segs" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button key={s.id} className={`seg ${i < idx ? "done" : ""} ${i === idx ? "cur" : ""}`} title={`${i + 1} · ${s.title}`} onClick={() => go(i)} role="tab" aria-selected={i === idx} aria-label={s.title} />
          ))}
        </div>
        <span className="sect">{idx === 0 ? "← → navigate · F fullscreen · T theme" : slide.section}</span>
        <button className="nav" onClick={next} disabled={idx === SLIDES.length - 1 && step >= steps - 1} aria-label="Next"><ChevronRight size={18} /></button>
        <button className="ico" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"} title="Theme (T)">{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button className="ico" onClick={toggleFullscreen} aria-label={fs ? "Exit fullscreen" : "Fullscreen"} title="Fullscreen (F)">{fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
      </footer>
    </MotionConfig>
  );
}
