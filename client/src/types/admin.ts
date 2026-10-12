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
