// Narration for the 3-minute investor film (yc-film case + yc-intro2 opening).
//   npx tsx docs/_voice-film.ts          generate missing clips, update manifests
//   npx tsx docs/_voice-film.ts --dry    list what would be generated
//   npx tsx docs/_voice-film.ts --force  regenerate everything (e.g. after a key/model change)
//
// Separate from docs/_voice.ts on purpose: the film uses the NEWEST OpenAI
// text-to-speech snapshot with the Marin voice — the same voice persona OpenAI's
// GPT-Live voice model ships with — so only these clips pay for the upgrade.
// The API key comes from the environment or the parent repo's git-ignored
// .env.local; it is only ever sent to api.openai.com and never printed or
// committed. Output is labelled as AI narration wherever the deck plays it.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { TourCase } from "../src/tour/types";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/voice-v2");
const MANIFEST = join(ROOT, "src/tour/v2/voice.json");
const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

// Newest TTS snapshot (Dec 2025). Marin — the GPT-Live voice.
const MODEL = "gpt-4o-mini-tts-2025-12-15";
const VOICE = "marin";
const INSTRUCTIONS = [
  "Identity: a founder-adjacent storyteller showing investors a product they're genuinely proud of — a real person, present in the room, not a narrator and never an ad read.",
  "Delivery: confident, cinematic and completely human. Vary pitch and energy with the story: lean in on the hook, quicken slightly through familiar ground, then slow down and drop your voice half a step to land the line that matters.",
  "Pauses: real ones. A breath before a turn ('and here's the thing'), a beat after a number, a clean stop at the end of a section — never rushed into the next sentence.",
  "Tone: warm, direct, quietly electric. Zero sales varnish, zero theatrics, never sing-song, never flat.",
  "Pace: brisk but unhurried — this is a three-minute film, so keep forward motion without ever sounding like you're racing the clock.",
  "Pronunciation: Wrapbox is 'wrap-box'. Read 'A-I' as two letters, 'M-C-P' as three letters, 'dot env' for .env, and 'wrapbox dot I-O' for wrapbox.io. Say product words plainly.",
].join(" ");

// ── The opening scene's three beats (played by record-yc.tsx at fixed times) ──
const INTRO_DIR = "yc-intro2";
const INTRO: { file: string; say: string }[] = [
  { file: "0-ai-employees.mp3", say: "Your company already has AI employees. They write code, they query databases — and nobody can see what they're allowed to do. Wrapbox can." },
  { file: "1-personas.mp3",     say: "Priya writes the rules. Daniel runs the agents. Alex approves the risky calls. Maya holds the override. One product for all four." },
  { file: "2-category.mp3",     say: "Not antivirus. Not device management. The runtime that decides what every agent may do — at the moment it acts." },
];

function apiKey(): string {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  for (const f of [join(ROOT, "../.env.local"), join(ROOT, ".env.local")]) {
    if (!existsSync(f)) continue;
    const m = readFileSync(f, "utf8").match(/^OPENAI_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("OPENAI_API_KEY not found (env or .env.local)");
}

async function speak(key: string, text: string, file: string) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, instructions: INSTRUCTIONS, response_format: "mp3" }),
    });
    if (res.ok) {
      const tmp = `${file}.src.mp3`;
      writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-ac", "1", "-b:a", "64k", file]);
      rmSync(tmp);
      return;
    }
    const msg = (await res.text()).slice(0, 200);
    if (attempt >= 4 || (res.status < 500 && res.status !== 429)) throw new Error(`TTS ${res.status}: ${msg}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

const durationMs = (file: string) =>
  Math.round(parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim()) * 1000);

async function main() {
  const tc = (await import(pathToFileURL(join(ROOT, "src/tour/v2/cases/yc-film.ts")).href)).default as TourCase;
  const jobs: { text: string; rel: string }[] = [];

  const filmFiles = tc.steps.map((s, i) => {
    const text = (s.say ?? `${s.title}. ${s.body}`).replace(/\s+/g, " ").trim();
    const rel = `yc-film/${i}.mp3`;
    if (FORCE || !existsSync(join(OUT, rel))) jobs.push({ text, rel });
    return rel;
  });
  for (const n of INTRO) {
    const rel = `${INTRO_DIR}/${n.file}`;
    if (FORCE || !existsSync(join(OUT, rel))) jobs.push({ text: n.say, rel });
  }

  console.log(`yc-film: ${tc.steps.length} steps + ${INTRO.length} intro beats · ${jobs.length} to generate (${MODEL}/${VOICE})`);
  if (DRY) { jobs.forEach((j) => console.log(`  ${j.rel}: ${j.text}`)); return; }

  const key = jobs.length ? apiKey() : "";
  for (const j of jobs) {
    mkdirSync(dirname(join(OUT, j.rel)), { recursive: true });
    await speak(key, j.text, join(OUT, j.rel));
    console.log(`  ✓ ${j.rel}`);
  }

  // Patch the shared v2 manifest with yc-film's clip list + measured lengths.
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  manifest.cases["yc-film"] = filmFiles.map((rel) => ({ file: rel, ms: durationMs(join(OUT, rel)) }));
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");

  // Intro manifest for docs/_record-yc.mjs.
  const im: Record<string, { ms: number }> = {};
  for (const n of INTRO) im[n.file] = { ms: durationMs(join(OUT, INTRO_DIR, n.file)) };
  writeFileSync(join(OUT, INTRO_DIR, "manifest.json"), JSON.stringify(im, null, 1) + "\n");

  const total = manifest.cases["yc-film"].reduce((n: number, x: { ms: number }) => n + x.ms, 0) +
    Object.values(im).reduce((n, x) => n + x.ms, 0);
  console.log(`manifests written · ${(total / 1000).toFixed(1)} s of narration`);
}

main().catch((e) => { console.error(String(e.message ?? e)); process.exit(1); });
