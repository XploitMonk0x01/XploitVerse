export interface AdminLab {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  category?: string;
  dockerImage: string;
  sourceRef: string;
  buildContextPath: string;
  exposedPorts: string[];
  isActive: boolean;
  taskCount?: number;
  createdAt?: string;
  flag?: string;
  points?: number;
  hintPenalty?: number;
  taskId?: number;
  roomId?: number;
  moduleId?: number;
}

export interface AdminLabsListResponse {
  labs: AdminLab[];
  dockerAvailable: boolean;
}

export interface AdminLabCreateResponse {
  lab: AdminLab;
  buildStatus: 'pending' | 'ready' | 'failed';
  buildError?: string;
  dockerAvailable: boolean;
}

export interface DockerfileValidationResponse {
  valid: boolean;
  issues: string[];
}

export interface AdminOverviewStats {
  totalUsers: number;
  students: number;
  instructors: number;
  admins: number;
  activeUsers: number;
  totalLabs: number;
  activeLabs: number;
  totalRooms: number;
  totalTasks: number;
  activeSessions: number;
  totalSessions: number;
  sessionsLast24h: number;
  activeContainers: number;
  solvedTasks: number;
  totalPoints: number;
  paidOrders: number;
  revenueInr: number;
}

export interface AdminOverviewSystem {
  dockerAvailable: boolean;
  postgresOk: boolean;
  redisAvailable: boolean;
  activeContainers: number;
}

export interface AdminOverviewUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  points: number;
  solved: number;
}

export interface AdminOverviewTopUser {
  rank: number;
  username: string;
  points: number;
  solved: number;
}

export interface AdminOverviewSession {
  id: number;
  username: string;
  status: string;
  startedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AdminOverview {
  stats: AdminOverviewStats;
  system: AdminOverviewSystem;
  recentUsers: AdminOverviewUser[];
  topUsers: AdminOverviewTopUser[];
  recentSessions: AdminOverviewSession[];
}

export interface AdminLabMetadata {
  title: string;
  slug?: string;
  description: string;
  difficulty: string;
  category: string;
  dockerImage?: string;
  ports: string[];
  flag: string;
  points: number;
  hintPenalty: number;
  taskTitle: string;
  taskBody: string;
  taskPrompt: string;
  hints: string[];
  buildNow: boolean;
}
