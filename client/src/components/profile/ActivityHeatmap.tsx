import { memo, useMemo } from "react";
import { Activity, Flame, TrendingUp } from "lucide-react";
import { Skeleton } from "../ui";
import {
  ACTIVITY_WEEKS,
  buildActivityGrid,
  bucketLevel,
  computeStreaks,
  formatActivityDate,
} from "../../utils/activity";
import type { ActivityDay } from "../../types";

interface ActivityHeatmapProps {
  /** Sparse per-day activity from the API. Empty means "no history yet". */
  days?: ActivityDay[] | null;
  loading?: boolean;
  error?: boolean;
}

// Grid geometry is pixel-exact, so it stays inline rather than in the scale.
const CELL = 11; // px square
const GAP = 3; // px between cells
const WEEKDAY_GUTTER = ["", "Mon", "", "Wed", "", "Fri", ""];

const LEVEL_CLASS = [
  "bg-bg-overlay",
  "bg-success/25",
  "bg-success/45",
  "bg-success/70",
  "bg-success",
];

/**
 * Presentational year graph. Every number shown here comes from the activity
 * endpoint — the grid, streaks and totals are derived in `utils/activity`, and
 * an account with no history legitimately renders an empty grid.
 */
export const ActivityHeatmap = memo(function ActivityHeatmap({
  days = null,
  loading = false,
  error = false,
}: ActivityHeatmapProps) {
  const { grid, streaks } = useMemo(
    () => ({
      grid: buildActivityGrid(days, ACTIVITY_WEEKS),
      streaks: computeStreaks(days),
    }),
    [days],
  );

  const pitch = CELL + GAP;
  const isEmpty = !loading && grid.total === 0;

  return (
    <div className="rounded-lg border border-border bg-bg-raised p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold tracking-tight text-fg">Activity</h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-5">
            <Skeleton variant="text" width="7rem" />
            <Skeleton variant="text" width="5rem" />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-5 text-sm">
            <span className="flex items-center gap-1.5 text-fg-muted">
              <Activity className="h-3.5 w-3.5 text-fg-subtle" strokeWidth={1.75} />
              <span className="font-semibold tabular-nums text-fg">{grid.total.toLocaleString()}</span>
              in the last 12 months
            </span>
            <span className="flex items-center gap-1.5 text-fg-muted">
              <Flame className="h-3.5 w-3.5 text-warn" strokeWidth={1.75} />
              <span className="font-semibold tabular-nums text-fg">{streaks.current}</span> day streak
            </span>
            <span className="flex items-center gap-1.5 text-fg-muted">
              <TrendingUp className="h-3.5 w-3.5 text-success" strokeWidth={1.75} />
              <span className="font-semibold tabular-nums text-fg">{streaks.longest}</span> best
            </span>
          </div>
        )}
      </div>

      {error && !loading && (
        <p className="mt-4 text-sm text-danger">Activity could not be loaded.</p>
      )}

      {isEmpty && !error && (
        <p className="mt-4 text-sm text-fg-muted">
          No lab activity recorded yet. Run a lab to start your history.
        </p>
      )}

      <div className="mt-5 overflow-x-auto pb-1">
        {loading ? (
          <Skeleton variant="rectangular" height="120px" className="w-full" />
        ) : (
          <div className="min-w-max">
            {/* Month labels */}
            <div className="relative mb-1 ml-8 h-3.5" style={{ width: grid.columns.length * pitch }}>
              {grid.columns.map((column, ci) =>
                column.monthLabel ? (
                  <span
                    key={column.cells[0].date}
                    className="absolute top-0 whitespace-nowrap text-[10px] text-fg-subtle"
                    style={{ left: ci * pitch }}
                  >
                    {column.monthLabel}
                  </span>
                ) : null,
              )}
            </div>

            <div className="flex" style={{ gap: GAP }}>
              {/* Weekday gutter */}
              <div className="mr-1 flex flex-col" style={{ gap: GAP }}>
                {WEEKDAY_GUTTER.map((label, i) => (
                  <span
                    key={i}
                    className="text-[10px] leading-none text-fg-subtle"
                    style={{ height: CELL, lineHeight: `${CELL}px` }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Week columns */}
              {grid.columns.map((column) => (
                <div key={column.cells[0].date} className="flex flex-col" style={{ gap: GAP }}>
                  {column.cells.map((cell) => (
                    <span
                      key={cell.date}
                      title={
                        cell.future
                          ? undefined
                          : `${cell.count} ${cell.count === 1 ? "activity" : "activities"} · ${formatActivityDate(cell.date)}`
                      }
                      className={cell.future ? "rounded-[2px] bg-transparent" : `rounded-[2px] ${LEVEL_CLASS[bucketLevel(cell.count)]}`}
                      style={{ width: CELL, height: CELL }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-fg-subtle">
        <span>Less</span>
        {LEVEL_CLASS.map((levelClass, i) => (
          <span key={i} className={`rounded-[2px] ${levelClass}`} style={{ width: CELL, height: CELL }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
});

export default ActivityHeatmap;
