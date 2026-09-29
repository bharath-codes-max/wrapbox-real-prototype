import type { Decision, SimulationEvent } from "../model/types";

export const HEAT_COLS = 52;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BUCKETS = [HOUR, 3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 7 * DAY, 30 * DAY];
const SEVERITY: Record<string, number> = { ALLOW: 0, CONSTRAIN: 1, REVIEW: 2, BLOCK: 3 };

export interface HeatCell {
  count: number;
  /** Most severe decision recorded in this bucket — what the cell is coloured by. */
  tone: Decision | null;
  byDecision: Partial<Record<Decision, number>>;
  latest: SimulationEvent | null;
}

export interface Heatmap {
  bucketMs: number;
  start: number;
  end: number;
  rows: { agent: string; cells: HeatCell[] }[];
  max: number;
  /** Events that fall outside the rows or the window — surfaced, never silently dropped. */
  dropped: number;
}

/** Buckets real events into agent × time cells. The bucket is the smallest step
 *  whose 52 columns cover the recorded history, aligned to local time and ending
 *  at the bucket that contains `now`. */
export function buildHeatmap(events: SimulationEvent[], agentIds: string[], now: number): Heatmap {
  const oldest = events.reduce((m, e) => Math.min(m, e.timestamp), now);
  const tz = new Date(now).getTimezoneOffset() * 60_000;
  const endFor = (b: number) => Math.floor((now - tz) / b) * b + tz + b;
  // Coverage is checked after alignment: snapping the end forward also moves the start.
  const bucketMs = BUCKETS.find((b) => endFor(b) - b * HEAT_COLS <= oldest) ?? BUCKETS[BUCKETS.length - 1];
  const end = endFor(bucketMs);
  const start = end - bucketMs * HEAT_COLS;

  const rows = agentIds.map((agent) => ({
    agent,
    cells: Array.from({ length: HEAT_COLS }, (): HeatCell => ({ count: 0, tone: null, byDecision: {}, latest: null })),
  }));
  const rowOf = new Map(rows.map((r) => [r.agent, r]));
  let dropped = 0;
  let max = 0;
  for (const e of events) {
    const row = rowOf.get(e.agent);
    const col = Math.floor((e.timestamp - start) / bucketMs);
    if (!row || col < 0 || col >= HEAT_COLS) { dropped++; continue; }
    const c = row.cells[col];
    c.count++;
    c.byDecision[e.decision] = (c.byDecision[e.decision] ?? 0) + 1;
    if (!c.tone || SEVERITY[e.decision] > SEVERITY[c.tone]) c.tone = e.decision;
    if (!c.latest || e.timestamp > c.latest.timestamp) c.latest = e;
    max = Math.max(max, c.count);
  }
  return { bucketMs, start, end, rows, max, dropped };
}

/** 1–4 intensity relative to the busiest cell, GitHub-style; 0 means empty. */
export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(4, Math.ceil((4 * count) / max))) as 1 | 2 | 3 | 4;
}

/** "last 52 hours" / "last 13 days" / "last 52 weeks" — the window the grid covers. */
export function heatWindowLabel(bucketMs: number): string {
  const total = bucketMs * HEAT_COLS;
  if (total <= 72 * HOUR) return `last ${Math.round(total / HOUR)} hours`;
  if (total <= 120 * DAY) return `last ${Math.round(total / DAY)} days`;
  return `last ${Math.round(total / (7 * DAY))} weeks`;
}

/** Column header text, shown only where the calendar unit changes (like GitHub's months). */
export function heatColumnLabel(h: Heatmap, col: number): string | null {
  const at = new Date(h.start + col * h.bucketMs);
  if (col === 0) return null;
  const prev = new Date(h.start + (col - 1) * h.bucketMs);
  if (h.bucketMs < DAY) {
    return at.getDate() !== prev.getDate() ? at.toLocaleDateString("en-US", { weekday: "short" }) : null;
  }
  return at.getMonth() !== prev.getMonth() ? at.toLocaleDateString("en-US", { month: "short" }) : null;
}

/** "Tue 14:00 – 15:00" or "Aug 3 – Aug 9" for a cell's tooltip. */
export function heatCellRange(h: Heatmap, col: number): string {
  const a = new Date(h.start + col * h.bucketMs);
  const b = new Date(h.start + (col + 1) * h.bucketMs);
  const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  if (h.bucketMs < DAY) return `${a.toLocaleDateString("en-US", { weekday: "short" })} ${time(a)} – ${time(b)}`;
  const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return h.bucketMs === DAY ? day(a) : `${day(a)} – ${day(new Date(b.getTime() - 1))}`;
}
