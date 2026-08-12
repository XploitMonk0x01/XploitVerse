export interface LabSession {
  id: number;
  userId: number;
  roomId?: number;
  taskId?: number;
  status: 'pending' | 'initializing' | 'running' | 'stopped' | 'terminated' | 'error';
  startedAt?: string;
  expiresAt?: string;
  networkName?: string;
  targetContainerId?: string;
  attackContainerId?: string;
  connectionInfo: Record<string, unknown>;
  lab?: number;
  publicIp?: string;
  instanceDetails?: {
    publicIp?: string;
    instanceType?: string;
    region?: string;
  };
  instanceType?: string;
  region?: string;
  cost?: number;
  duration?: number;
  endedAt?: string;
  createdAt?: string;
  labName?: string;
}

export interface LabSessionSummary {
  id: number;
  status: string;
  startedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface Lab {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  estimatedDuration: number;
  objectives: string[];
  instructions: string;
  hints: string[];
  tools: string[];
  tags: string[];
  isActive: boolean;
  isPublished: boolean;
  dockerImage: string;
  sourceType: string;
  sourceRef: string;
  exposedPorts: string[];
  env: Record<string, unknown>;
  resources?: Array<{
    title: string;
    url: string;
  }>;
}

export interface ActiveSessionResponse {
  id: number;
  status: string;
  roomId?: number;
  taskId?: number;
  containerId?: string;
  networkName?: string;
  startedAt?: string;
  expiresAt?: string;
}

export interface LabStartResponse {
  session: {
    id: number;
    status: string;
    labName: string;
    lab: number;
  };
}

export interface ProvisionResponse {
  session: {
    id: number;
    status: string;
    publicIp: string;
    startedAt: string;
    expiresAt: string;
    containerId: string;
  };
}