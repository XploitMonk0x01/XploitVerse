export interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  points: number;
  totalPoints?: number;
  tasksCompleted?: number;
  userID?: number;
}

export interface MyRank {
  rank: number;
  points: number;
  totalPoints?: number;
  tasksCompleted?: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface MyRankResponse {
  rank: number;
  points: number;
  totalPoints?: number;
  tasksCompleted?: number;
}

export interface ProgressEntry {
  taskId: string;
  state: 'in_progress' | 'completed';
  startedAt: string;
  completedAt?: string;
  attempts: number;
  pointsEarned: number;
}

export interface ProgressSummary {
  completedTasks: number;
  totalPoints: number;
}

export interface ProgressResponse {
  progress: ProgressEntry[];
  summary: ProgressSummary;
}

export interface FlagSubmitResponse {
  taskId: number;
  pointsEarned?: number;
  alreadySolved?: boolean;
  message?: string;
  completedAt?: string;
}

export interface ApiListResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiSingleResponse<T> {
  data: T;
}