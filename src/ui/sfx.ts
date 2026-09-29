// Interface sound effects, synthesised with Web Audio (no audio assets). Shaped
// after warp.dev's own UI sounds, measured from their files: a hover "thock"
// (~8 ms attack, ~250 Hz body), a click (~6 ms bright noise tick) and a
// confirmation chime (~2.5 kHz, ~370 ms decay). On by default like Warp's; the
// mute choice persists. Browsers only allow audio after a user gesture, so the
// context is created on the first pointerdown/keydown — hovers before that are
// silent, exactly as on warp.dev.

const KEY = "wrapbox-sfx-muted";
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let lastHover = 0;
let muted = (() => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } })();
const listeners = new Set<() => void>();

function unlock() {
  if (ctx) { if (ctx.state === "suspended") void ctx.resume(); return; }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
    noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}

function ready(): AudioContext | null {
  if (muted || !ctx || ctx.state !== "running") return null;
  return ctx;
}

function env(c: AudioContext, peak: number, attack: number, decay: number) {
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(c.destination);
  return g;
}

function noiseBurst(c: AudioContext, type: BiquadFilterType, freq: number, peak: number, attack: number, decay: number) {
  if (!noise) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = 0.9;
  src.connect(f); f.connect(env(c, peak, attack, decay));
  src.start(); src.stop(c.currentTime + attack + decay + 0.01);
}

export const sfx = {
  /** Soft low thock with a whisper of fizz — throttled so sweeping a grid isn't a drumroll. */
  hover() {
    const c = ready(); if (!c) return;
    const now = performance.now();
    if (now - lastHover < 45) return;
    lastHover = now;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(260, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.05);
    o.connect(env(c, 0.07, 0.006, 0.06));
    o.start(); o.stop(c.currentTime + 0.08);
    noiseBurst(c, "bandpass", 3200, 0.018, 0.003, 0.02);
  },
  /** Crisp bright tick. */
  click() {
    const c = ready(); if (!c) return;
    noiseBurst(c, "highpass", 5200, 0.14, 0.001, 0.012);
  },
  /** Two-partial confirmation chime. */
  chime() {
    const c = ready(); if (!c) return;
    for (const [hz, peak] of [[2490, 0.035], [3735, 0.014]] as const) {
      const o = c.createOscillator();
      o.type = "sine"; o.frequency.value = hz;
      o.connect(env(c, peak, 0.03, 0.4));
      o.start(); o.stop(c.currentTime + 0.45);
    }
  },
  isMuted: () => muted,
  setMuted(v: boolean) {
    muted = v;
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* private mode */ }
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};
