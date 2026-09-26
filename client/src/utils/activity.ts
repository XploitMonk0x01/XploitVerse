import type { ActivityDay } from '../types';

/**
 * Pure helpers behind the profile activity heatmap.
 *
 * Day identity is handled as `YYYY-MM-DD` strings throughout: `new Date('2026-01-05')`
 * is parsed as UTC midnight while `new Date()` is local, so round-tripping through
 * Date objects silently shifts buckets for anyone not on UTC. Every conversion here
 * goes through `Date.UTC` explicitly instead.
 */

export const ACTIVITY_WEEKS = 53;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface ActivityCell {
  date: string;
  count: number;
  /** Day after the current one — rendered as an empty placeholder. */
  future: boolean;
}

export interface ActivityColumn {
  cells: ActivityCell[];
  /** Month label for this column, or null when the month continues. */
  monthLabel: string | null;
}

export interface ActivityGrid {
  columns: ActivityColumn[];
  total: number;
  activeDays: number;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Parses a `YYYY-MM-DD` string into a UTC midnight timestamp. */
const dayNumber = (iso: string): number | null => {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const ts = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(ts);
  // Rejects rolled-over inputs such as 2026-02-30.
  if (date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) return null;
  return ts / MS_PER_DAY;
};

const isoFromDayNumber = (day: number): string =>
  new Date(day * MS_PER_DAY).toISOString().slice(0, 10);

/** Today's UTC calendar day. */
export const currentISODay = (): string => new Date().toISOString().slice(0, 10);

/** Collapses duplicate/unordered server rows into one count per day. */
export function toDayCounts(days: ActivityDay[] | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of days || []) {
    if (!row || dayNumber(row.date) === null) continue;
    const count = Number.isFinite(row.count) && row.count > 0 ? Math.floor(row.count) : 0;
    if (count === 0) continue;
    counts.set(row.date, (counts.get(row.date) || 0) + count);
  }
  return counts;
}

/** Maps a daily event count onto the 0–4 heat scale. */
export function bucketLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

/**
 * Builds a Sunday-aligned, column-major grid covering `weeks` columns and
 * ending on the week that contains `today`.
 */
export function buildActivityGrid(
  days: ActivityDay[] | null | undefined,
  weeks: number = ACTIVITY_WEEKS,
  today: string = currentISODay(),
): ActivityGrid {
  const counts = toDayCounts(days);
  const todayDay = dayNumber(today);
  const anchor = todayDay === null ? dayNumber(currentISODay())! : todayDay;

  // Start on the Sunday of the earliest week that still ends on `today`'s week.
  const startOfWindow = anchor - (weeks * 7 - 1);
  const startDow = ((new Date(startOfWindow * MS_PER_DAY).getUTCDay() % 7) + 7) % 7;
  const gridStart = startOfWindow - startDow;
  const columnCount = Math.ceil((anchor - gridStart + 1) / 7);

  const columns: ActivityColumn[] = [];
  let total = 0;
  let activeDays = 0;
  let lastMonth = -1;

  for (let col = 0; col < columnCount; col += 1) {
    const cells: ActivityCell[] = [];
    for (let row = 0; row < 7; row += 1) {
      const dayNumberValue = gridStart + col * 7 + row;
      if (dayNumberValue > anchor) {
        cells.push({ date: isoFromDayNumber(dayNumberValue), count: 0, future: true });
        continue;
      }
      const date = isoFromDayNumber(dayNumberValue);
      const count = counts.get(date) || 0;
      total += count;
      if (count > 0) activeDays += 1;
      cells.push({ date, count, future: false });
    }

    const firstDay = gridStart + col * 7;
    const month = new Date(firstDay * MS_PER_DAY).getUTCMonth();
    const monthLabel = month === lastMonth ? null : MONTH_LABELS[month];
    lastMonth = month;
    columns.push({ cells, monthLabel });
  }

  return { columns, total, activeDays };
}

/**
 * Current and longest streaks of consecutive active days. A streak that ended
 * yesterday still counts as current — today is simply not over yet.
 */
export function computeStreaks(
  days: ActivityDay[] | null | undefined,
  today: string = currentISODay(),
): { current: number; longest: number } {
  const counts = toDayCounts(days);
  if (counts.size === 0) return { current: 0, longest: 0 };

  const sorted = [...counts.keys()]
    .map((iso) => ({ iso, day: dayNumber(iso) as number }))
    .sort((a, b) => a.day - b.day);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    run = sorted[i].day === sorted[i - 1].day + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const todayDay = dayNumber(today);
  let current = 0;
  if (todayDay !== null) {
    // Walk back from today, tolerating a not-yet-active today.
    let cursor = counts.has(isoFromDayNumber(todayDay)) ? todayDay : todayDay - 1;
    while (counts.has(isoFromDayNumber(cursor))) {
      current += 1;
      cursor -= 1;
    }
  }

  return { current, longest };
}

/** Formats a grid day for tooltips, e.g. "Sep 15, 2026". */
export function formatActivityDate(iso: string): string {
  const day = dayNumber(iso);
  if (day === null) return iso;
  return new Date(day * MS_PER_DAY).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
