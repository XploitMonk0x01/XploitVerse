import { describe, it, expect } from 'vitest';
import { buildActivityGrid, bucketLevel, computeStreaks, toDayCounts } from './activity';
import type { ActivityDay } from '../types';

const TODAY = '2026-03-15';

const day = (date: string, count = 1): ActivityDay => ({ date, count });

/** UTC day-of-week without bare-date parsing (which would use UTC midnight). */
const utcDow = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();

describe('bucketLevel', () => {
  it('maps counts onto the 0-4 heat scale', () => {
    expect(bucketLevel(0)).toBe(0);
    expect(bucketLevel(-3)).toBe(0);
    expect(bucketLevel(1)).toBe(1);
    expect(bucketLevel(2)).toBe(1);
    expect(bucketLevel(3)).toBe(2);
    expect(bucketLevel(4)).toBe(2);
    expect(bucketLevel(5)).toBe(3);
    expect(bucketLevel(6)).toBe(3);
    expect(bucketLevel(7)).toBe(4);
    expect(bucketLevel(100)).toBe(4);
  });
});

describe('toDayCounts', () => {
  it('returns an empty map for missing input', () => {
    expect(toDayCounts(null).size).toBe(0);
    expect(toDayCounts([]).size).toBe(0);
  });

  it('sums duplicate rows regardless of order', () => {
    const counts = toDayCounts([day('2026-03-14', 2), day('2026-03-15', 1), day('2026-03-14', 3)]);
    expect(counts.get('2026-03-14')).toBe(5);
    expect(counts.get('2026-03-15')).toBe(1);
    expect(counts.size).toBe(2);
  });

  it('drops zero, negative and malformed rows', () => {
    const counts = toDayCounts([
      day('2026-03-14', 0),
      day('2026-03-13', -4),
      { date: 'not-a-date', count: 2 },
      { date: '2026-02-30', count: 2 },
      day('2026-03-12', 1.9),
    ]);
    expect([...counts.keys()]).toEqual(['2026-03-12']);
    expect(counts.get('2026-03-12')).toBe(1);
  });
});

describe('computeStreaks', () => {
  it('is zero for a brand-new account', () => {
    expect(computeStreaks([], TODAY)).toEqual({ current: 0, longest: 0 });
    expect(computeStreaks(null, TODAY)).toEqual({ current: 0, longest: 0 });
  });

  it('counts a contiguous run ending today', () => {
    const days = [day('2026-03-13'), day('2026-03-14'), day('2026-03-15')];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('keeps a streak current when it ended yesterday', () => {
    const days = [day('2026-03-12'), day('2026-03-13'), day('2026-03-14')];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('resets the current streak across a gap', () => {
    const days = [day('2026-03-01'), day('2026-03-02'), day('2026-03-04'), day('2026-03-05')];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 0, longest: 2 });
  });

  it('reports the longest run even when it is older than the current one', () => {
    const days = [
      day('2026-01-01'), day('2026-01-02'), day('2026-01-03'), day('2026-01-04'),
      day('2026-03-14'), day('2026-03-15'),
    ];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 2, longest: 4 });
  });

  it('ignores input order and duplicate rows', () => {
    const days = [day('2026-03-15', 2), day('2026-03-13'), day('2026-03-15'), day('2026-03-14')];
    expect(computeStreaks(days, TODAY)).toEqual({ current: 3, longest: 3 });
  });

  it('does not treat a single active day far in the past as current', () => {
    expect(computeStreaks([day('2026-01-01')], TODAY)).toEqual({ current: 0, longest: 1 });
  });
});

describe('buildActivityGrid', () => {
  it('renders an all-zero grid with an honest total for an empty account', () => {
    const grid = buildActivityGrid([], 53, TODAY);
    expect(grid.total).toBe(0);
    expect(grid.activeDays).toBe(0);
    expect(grid.columns.length).toBeGreaterThanOrEqual(53);
    expect(grid.columns.length).toBeLessThanOrEqual(54);
    for (const column of grid.columns) expect(column.cells).toHaveLength(7);
  });

  it('aligns every column to start on a Sunday', () => {
    const grid = buildActivityGrid([day(TODAY, 4)], 12, TODAY);
    for (const column of grid.columns) {
      expect(utcDow(column.cells[0].date)).toBe(0);
      expect(utcDow(column.cells[6].date)).toBe(6);
    }
  });

  it('flags cells after today as future', () => {
    const grid = buildActivityGrid([day(TODAY)], 12, TODAY);
    const flat = grid.columns.flatMap((column) => column.cells);
    const todayIndex = flat.findIndex((cell) => cell.date === TODAY);
    expect(flat[todayIndex].future).toBe(false);
    expect(flat[todayIndex].count).toBe(1);
    for (const cell of flat.slice(todayIndex + 1)) {
      expect(cell.future).toBe(true);
      expect(cell.count).toBe(0);
    }
  });

  it('sums only activity inside the window and exposes month labels', () => {
    const grid = buildActivityGrid([day(TODAY, 3), day('2026-03-14', 2), day('2020-01-01', 9)], 12, TODAY);
    expect(grid.total).toBe(5);
    expect(grid.activeDays).toBe(2);
    expect(grid.columns[0].monthLabel).not.toBeNull();
    const labels = grid.columns.map((column) => column.monthLabel).filter(Boolean);
    expect(labels.length).toBeLessThanOrEqual(grid.columns.length);
    expect(labels).toContain('Mar');
  });

  it('keeps pre-window activity out of the graph total', () => {
    const grid = buildActivityGrid([day('2025-01-01', 7)], 53, TODAY);
    expect(grid.total).toBe(0);
    expect(grid.activeDays).toBe(0);
  });
});
