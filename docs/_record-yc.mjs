// Records the YC product-demo page (record-yc.html, dark theme) as a sub-100 MB
// 1920×1080 MP4. Opens with a 27-second cinematic intro (code snippets, personas,
// positioning line) narrated by three dedicated clips in docs/voice-v2/yc-intro/,
// then crossfades into the real product tour (tour-v2.html?case=yc-demo).
//
// Prerequisites:
//   • docs/record-yc.html and docs/tour-v2.html built, served on :5982 from docs/
//   • docs/voice-v2/yc-intro/*.mp3 (3 clips) with docs/voice-v2/yc-intro/manifest.json
//   • docs/voice-v2/yc-demo/*.mp3 + src/tour/v2/voice.json (npx tsx docs/_voice.ts --v2)
//   • docs/video/.tmp/music.wav (python3 docs/_music-yc.py)
//   • ffmpeg, Google Chrome, playwright-core
// Produces docs/video/wrapbox-yc-demo.mp4 and reports its size.
import { chromium } from "playwright-core";
import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL = arg("--url", "http://localhost:5982/record-yc.html");
const FPS = 30, W = 1920, H = 1080, SR = 48000;
const TAIL_MS = 2500;
const MAX_SECONDS = 215;
const OUT = join(ROOT, "docs/video");
const TMP = join(OUT, ".tmp");
mkdirSync(TMP, { recursive: true });

const VIDEO_ONLY = join(TMP, "yc-video.mp4");
const VOICE_WAV = join(TMP, "yc-voice.wav");
const MUSIC_WAV = join(TMP, "music.wav");
const AUDIO_MIX = join(TMP, "yc-audio.m4a");
const FINAL = join(OUT, "wrapbox-yc-demo.mp4");

if (!existsSync(MUSIC_WAV)) throw new Error(`${MUSIC_WAV} missing — run: python3 docs/_music-yc.py ${MUSIC_WAV}`);
const tourManifest = JSON.parse(readFileSync(join(ROOT, "src/tour/v2/voice.json"), "utf8"));
const tourClips = tourManifest.cases["yc-demo"];
if (!tourClips) throw new Error("yc-demo clips missing — run: npx tsx docs/_voice.ts --v2");
const introManifest = JSON.parse(readFileSync(join(ROOT, "docs/voice-v2/yc-intro/manifest.json"), "utf8"));
const INTRO_FILES = ["0-ai-agents.mp3", "1-personas.mp3", "2-not-edr.mp3"];

/* ---------------------------------------------------------------- capture */
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "23",
  "-maxrate", "4500k", "-bufsize", "9000k",
  "-profile:v", "high", "-pix_fmt", "yuv420p",
  "-g", String(FPS), "-bf", "2", "-r", String(FPS), VIDEO_ONLY,
], { stdio: ["pipe", "inherit", "inherit"] });

const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--autoplay-policy=no-user-gesture-required", "--headless=new", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-features=CalculateNativeWinOcclusion"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const narr = [];
let doneAt = 0, failed = null;
await page.exposeFunction("__wbRec", (ev) => {
  if (typeof ev.narrated === "number") {
    const file = ev.intro ? ev.file : null;
    narr.push({ i: ev.narrated, at: ev.at, introFile: file });
    process.stdout.write(`\r  narrated ${ev.narrated}${ev.intro ? " (intro)" : ""}   `);
  }
  if (ev.done) doneAt = ev.done;
  if (ev.error != null) failed = ev.error;
});
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForSelector(".rvy-view", { timeout: 10_000 });
await page.evaluate(() => document.fonts.ready);

const cdp = await page.context().newCDPSession(page);
let t0 = 0, written = 0, last = null;
const writeUpTo = (tSec) => {
  const target = Math.floor((tSec - t0) * FPS);
  while (last && written < target) { ff.stdin.write(last); written++; }
};
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const wall = Date.now() / 1000;
  const ts = metadata.timestamp && Math.abs(metadata.timestamp - wall) < 5 ? metadata.timestamp : wall;
  if (!t0) t0 = ts;
  writeUpTo(ts);
  last = Buffer.from(data, "base64");
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1, maxWidth: W, maxHeight: H });
// Short lead-in so the opening frame has settled, then start the show.
await page.waitForTimeout(600);
await page.evaluate(() => {
  window.__wbGo && window.__wbGo();
  // Nudge the compositor so headless Chrome keeps delivering frames on idle screens.
  window.__wbTick = window.setInterval(() => {
    document.documentElement.style.setProperty("--_t", String(Date.now()));
  }, 100);
});

const t1 = Date.now();
while (!doneAt && !failed && Date.now() - t1 < MAX_SECONDS * 1000) {
  await page.waitForTimeout(250);
  writeUpTo(Date.now() / 1000);
}
const endAt = (doneAt || Date.now()) + (doneAt ? TAIL_MS : 0);
while (Date.now() < endAt) { await page.waitForTimeout(100); writeUpTo(Date.now() / 1000); }
writeUpTo(endAt / 1000);
await cdp.send("Page.stopScreencast");
await browser.close();
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
const durSec = written / FPS;
console.log(`\n  video: ${written} frames · ${durSec.toFixed(1)} s · ${narr.length} narrated lines`);
if (!written) throw new Error("no frames captured — abort");

/* ---------------------------------------------------------------- voice bed */
// Int16 mono PCM at 48 kHz. The intro clips are addressed by their intro file; the
// tour clips come from the yc-demo manifest. Narration indices in `narr` are the
// values the recorder received: the intro posts i = 0..2, the tour posts
// i = 3..(2+tourCount) because record-yc.tsx shifts them by INTRO_NARR.length.
const totalSamples = Math.ceil(durSec * SR);
const pcm = new Int16Array(totalSamples);

const decode = (file) => {
  const raw = execFileSync("ffmpeg", ["-loglevel", "error", "-i", join(ROOT, "docs/voice-v2", file),
    "-f", "s16le", "-ac", "1", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
  return new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1);
};

// Build a de-duplicated list of narration placements, each with its clip length.
const INTRO_COUNT = INTRO_FILES.length;
const placements = [];
const seen = new Set();
for (const n of narr) {
  if (seen.has(n.i)) continue;
  seen.add(n.i);
  if (n.i < INTRO_COUNT) {
    const file = `yc-intro/${INTRO_FILES[n.i]}`;
    const ms = introManifest[INTRO_FILES[n.i]]?.ms ?? 0;
    if (ms) placements.push({ at: n.at, file, ms });
  } else {
    const tourIdx = n.i - INTRO_COUNT;
    const clip = tourClips[tourIdx];
    if (clip?.ms) placements.push({ at: n.at, file: clip.file, ms: clip.ms });
  }
}
placements.sort((a, b) => a.at - b.at);

// Overlap guard: if a clip starts before the previous one has finished, truncate
// the previous one with a 60 ms fade so no voice ever doubles. Keeps the recording
// crisp if the walkthrough's pacing ever runs tight.
for (let i = 0; i + 1 < placements.length; i++) {
  const cur = placements[i], next = placements[i + 1];
  const endAt = cur.at + cur.ms;
  if (next.at < endAt) cur.truncateAt = next.at - 60; // 60 ms earlier so the fade finishes before next starts
}

let overlapped = 0;
for (const p of placements) {
  const s = decode(p.file);
  const off = Math.round((p.at / 1000 - t0) * SR);
  const limit = p.truncateAt
    ? Math.min(s.length, Math.round(((p.truncateAt - p.at) / 1000) * SR))
    : s.length;
  const fade = Math.min(limit, Math.round(SR * 0.06));
  for (let k = 0; k < limit && off + k < totalSamples; k++) {
    if (off + k < 0) continue;
    let v = s[k];
    if (p.truncateAt && k >= limit - fade) v = Math.round(v * ((limit - k) / fade));
    const sum = pcm[off + k] + v;
    pcm[off + k] = sum > 32767 ? 32767 : sum < -32768 ? -32768 : sum;
  }
  if (p.truncateAt) overlapped++;
}
if (overlapped) console.log(`  (${overlapped} clip${overlapped === 1 ? "" : "s"} truncated for overlap safety)`);

const dataBytes = pcm.length * 2;
const h = Buffer.alloc(44);
h.write("RIFF", 0); h.writeUInt32LE(36 + dataBytes, 4); h.write("WAVE", 8);
h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
h.write("data", 36); h.writeUInt32LE(dataBytes, 40);
writeFileSync(VOICE_WAV, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, dataBytes)]));

/* ---------------------------------------------------------------- mix ------ */
execFileSync("ffmpeg", ["-y", "-loglevel", "error",
  "-i", VOICE_WAV, "-stream_loop", "-1", "-i", MUSIC_WAV,
  "-filter_complex",
  `[0:a]aformat=sample_fmts=s16:channel_layouts=mono,pan=stereo|c0=c0|c1=c0[v];` +
  `[1:a]volume=0.16,aformat=sample_fmts=s16:channel_layouts=stereo[m];` +
  `[v][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[mix]`,
  "-map", "[mix]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
  "-t", String(durSec), AUDIO_MIX,
]);

/* ---------------------------------------------------------------- mux ----- */
execFileSync("ffmpeg", ["-y", "-loglevel", "error",
  "-i", VIDEO_ONLY, "-i", AUDIO_MIX,
  "-c:v", "copy", "-c:a", "copy",
  "-shortest", "-movflags", "+faststart", FINAL,
]);

const bytes = statSync(FINAL).size;
console.log(`\n✓ ${FINAL}`);
console.log(`  ${(bytes / 1024 / 1024).toFixed(1)} MB · ${durSec.toFixed(1)} s · ${W}×${H} · ${FPS} fps`);
if (bytes > 100 * 1024 * 1024) console.log(`  ⚠ above YC's 100 MB cap — re-encode at a lower bitrate`);
for (const f of [VIDEO_ONLY, VOICE_WAV, AUDIO_MIX]) try { rmSync(f); } catch {}
