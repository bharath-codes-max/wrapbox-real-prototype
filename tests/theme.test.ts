// The live prototype's design tokens (src/styles/desktop.css): the Dovetail palette is
// what the file says it is, both themes define the same tokens, and every text and
// status colour is readable (WCAG 2.1 AA) on every surface it sits on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/desktop.css", import.meta.url), "utf8");

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(selector + " {");
  assert.ok(start >= 0, `token block ${selector} exists`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}
const DARK = tokens(':root[data-ds]:not([data-theme="light"])');
const LIGHT = tokens(':root[data-ds][data-theme="light"]');

type RGBA = [number, number, number, number];
function parse(c: string): RGBA {
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [parseInt(hex[1].slice(0, 2), 16), parseInt(hex[1].slice(2, 4), 16), parseInt(hex[1].slice(4, 6), 16), 1];
  const rgba = c.match(/^rgba?\(([^)]+)\)$/);
  assert.ok(rgba, `colour "${c}" is a hex or rgba value`);
  const [r, g, b, a = 1] = rgba![1].split(",").map((x) => Number(x.trim()));
  return [r, g, b, a];
}
/** Composite a (possibly translucent) colour over an opaque one. */
const over = (top: RGBA, under: RGBA): RGBA => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a: RGBA, b: RGBA) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test("dark theme is the Dovetail palette, literally", () => {
  assert.equal(DARK["--bg"], "#0a0a0a");       // carbon — canvas
  assert.equal(DARK["--surface"], "#141414");  // graphite — card
  assert.equal(DARK["--surface-2"], "#1e1e1e"); // iron — elevated
  assert.equal(DARK["--line-strong"], "#313131"); // slate edge
  assert.equal(DARK["--ds-border-strong"], "#454545"); // smoke — ghost button
  assert.equal(DARK["--fg"], "#ffffff");       // bone
  assert.equal(DARK["--fg-2"], "#a7a7a7");     // ash
  assert.equal(DARK["--fg-4"], "#7c7c7c");     // mist
  assert.equal(DARK["--accent"], "#6798ff");   // soft indigo
  assert.equal(DARK["--code-bg"], "#000000");  // pure black — deepest
  // The primary action is the inverted fill: white with carbon text.
  assert.equal(DARK["--ds-primary"], "#ffffff");
  assert.equal(DARK["--ds-primary-fg"], "#0a0a0a");
  // The 8% white hairline is Iron on the canvas, as the reference states.
  assert.deepEqual(over(parse(DARK["--line"]), parse(DARK["--bg"])).slice(0, 3).map(Math.round), [30, 30, 30]);
});

test("light theme mirrors it: same tokens, inverted primary, an accent that passes as text", () => {
  assert.deepEqual(Object.keys(LIGHT).sort(), Object.keys(DARK).sort(), "both themes define exactly the same tokens");
  assert.equal(LIGHT["--fg"], DARK["--ds-primary-fg"]);
  assert.equal(LIGHT["--ds-primary"], "#0a0a0a");
  assert.equal(LIGHT["--ds-primary-fg"], "#ffffff");
  // Cards rise by luminance in both themes: brighter than the canvas.
  for (const t of [DARK, LIGHT]) assert.ok(lum(parse(t["--surface"])) > lum(parse(t["--bg"])), "a card is lighter than the canvas");
});

test("there are no drop shadows, and the two radii are 8px and 4px", () => {
  for (const t of [DARK, LIGHT]) for (const k of ["--shadow-sm", "--shadow", "--shadow-md", "--shadow-lg"]) assert.equal(t[k], "0 0 0 0 transparent", k);
  const shared = tokens(":root[data-ds]");
  assert.equal(shared["--r"], "8px");
  assert.equal(shared["--r-sm"], "4px");
  // Every literal radius in the file is one of the system's: 8px, 4px, a hairline (≤3px), a circle or a bar/pill.
  const literal = new Set([...css.matchAll(/border-radius:\s*([^;!]+?)\s*(?:!important)?;/g)].map((m) => m[1]).filter((v) => !v.includes("style*=")));
  for (const v of literal) assert.match(v, /^(0|2px|3px|4px|8px|50%|999px|var\(--r-pill\))$/, `unexpected radius ${v}`);
});

for (const [name, t] of [["dark", DARK], ["light", LIGHT]] as const) {
  test(`${name}: text and status colours are readable on every surface (WCAG AA)`, () => {
    const bg = parse(t["--bg"]);
    const card = parse(t["--surface"]);
    const surfaces: [string, RGBA][] = [
      ["canvas", bg], ["card", card], ["elevated", parse(t["--surface-2"])],
      ["card hover", over(parse(t["--ds-hover"]), card)], ["selected on canvas", over(parse(t["--ds-selected"]), bg)],
    ];
    const worst = (token: string) => Math.min(...surfaces.map(([, s]) => contrast(parse(t[token]), s)));
    // Body, secondary and metadata text: 4.5:1 everywhere.
    for (const k of ["--fg", "--fg-2", "--fg-3"]) assert.ok(worst(k) >= 4.5, `${k} is ${worst(k).toFixed(2)}:1 at worst`);
    // The most muted tone is for inactive text and placeholders only.
    assert.ok(worst("--fg-4") >= 3, `--fg-4 is ${worst("--fg-4").toFixed(2)}:1 at worst`);
    // The accent is used as link and label text.
    assert.ok(worst("--accent") >= 4.5, `--accent is ${worst("--accent").toFixed(2)}:1 at worst`);
    // Decision and status tags are small text on their own soft tint over a card.
    for (const k of ["allow", "constrain", "review", "block"]) {
      const tint = over(parse(t[`--${k}-soft`]), card);
      const c = Math.min(contrast(parse(t[`--${k}`]), tint), contrast(parse(t[`--${k}`]), card), contrast(parse(t[`--${k}`]), bg));
      assert.ok(c >= 4.5, `--${k} tag text is ${c.toFixed(2)}:1`);
    }
    // Buttons: label on the filled primary, and on the accent.
    assert.ok(contrast(parse(t["--ds-primary-fg"]), parse(t["--ds-primary"])) >= 7);
    assert.ok(contrast(parse(t["--accent-fg"]), parse(t["--accent"])) >= 4.5);
    // Borders that carry meaning (inputs, the ghost button) are visible: 3:1 is for
    // the control as a whole, so the edge needs to clear the surface clearly.
    assert.ok(contrast(parse(t["--ds-border-strong"]), card) >= 1.6, "ghost button edge is visible on a card");
  });
}
