// Deck v2 plays its walkthroughs in the live prototype's shell (tour-v2.html). These
// guard what a viewer hears and reads: every step has narration on disk, and the words
// match the product the viewer sees — Glycon, three places — not the original shell's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { TourCase } from "../src/tour/types";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "src/tour/v2/cases");
const files = readdirSync(DIR).filter((f) => f.endsWith(".ts") && f !== "index.ts");
const cases: TourCase[] = [];
for (const f of files) cases.push((await import(pathToFileURL(join(DIR, f)).href)).default as TourCase);
const manifest = JSON.parse(readFileSync(join(ROOT, "src/tour/v2/voice.json"), "utf8")) as { cases: Record<string, { file: string; ms: number }[]> };
const words = (c: TourCase) => [c.title, c.goal, c.outcome, ...c.steps.flatMap((s) => [s.title, s.body, s.say ?? ""])];

test("deck v2: every case is well formed and ids are unique", () => {
  assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
  for (const c of cases) {
    assert.ok(c.steps.length >= 5, `${c.id} has steps`);
    assert.ok(c.steps.every((s) => s.title && s.body), `${c.id}: every step has a title and a body`);
    assert.equal(c.id + ".ts", files.find((f) => f === c.id + ".ts"), `${c.id}: file name matches id`);
  }
});

test("deck v2: every step has narration on disk, with a real length", () => {
  for (const c of cases) {
    const clips = manifest.cases[c.id];
    assert.ok(clips, `${c.id} is in the narration manifest`);
    assert.equal(clips.length, c.steps.length, `${c.id}: one clip per step`);
    clips.forEach((x, i) => {
      assert.ok(x.ms > 500, `${c.id} step ${i + 1}: clip has a length`);
      assert.ok(existsSync(join(ROOT, "docs/voice-v2", x.file)), `${c.id} step ${i + 1}: ${x.file} exists`);
    });
  }
  assert.deepEqual(Object.keys(manifest.cases).sort(), cases.map((c) => c.id).sort(), "no clips for removed cases");
});

test("deck v2: the words match the live prototype (Glycon, three places)", () => {
  for (const c of cases) for (const w of words(c)) {
    assert.ok(!/veridian/i.test(w), `${c.id}: the company is Glycon in the live prototype — "${w.slice(0, 60)}"`);
    assert.ok(!/\bplanes?\b/i.test(w), `${c.id}: places, not planes — "${w.slice(0, 60)}"`);
    assert.ok(!/\bEndpoint\b(?! runtime| Security)/.test(w), `${c.id}: Device, not Endpoint — "${w.slice(0, 60)}"`);
  }
});

test("deck v2: the new features have their own walkthroughs", () => {
  const ids = cases.map((c) => c.id);
  assert.ok(ids.includes("grant-permission"));
  assert.ok(ids.includes("core-brain"));
  const brain = cases.find((c) => c.id === "core-brain")!;
  for (const tab of ["What it sees", "The checks", "How it is built"]) assert.ok(brain.steps.some((s) => typeof s.target === "object" && s.target.text === tab), `core-brain opens "${tab}"`);
});
