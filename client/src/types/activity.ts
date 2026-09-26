/** A single UTC calendar day in a user's activity history. */
export interface ActivityDay {
  /** Calendar day in `YYYY-MM-DD` form, always interpreted as UTC. */
  date: string;
  /** Sessions started plus tasks completed on that day. */
  count: number;
}

export interface ActivitySummary {
  /** Sparse: only days with activity are returned. */
  days: ActivityDay[];
  total: number;
}

export type ActivityResponse = ActivitySummary;
