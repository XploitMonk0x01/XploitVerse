export interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isPremium: boolean;
  isPublished: boolean;
  tags: string[];
  createdAt: string;
  category?: string;
}

export interface Module {
  id: number;
  roomId: number;
  title: string;
  description: string;
  order: number;
  pointsReward: number;
}

export interface Task {
  id: number;
  roomId: number;
  moduleId?: number;
  assetId?: number;
  title: string;
  type: 'flag' | 'question' | 'interactive';
  flagType: string;
  contentMd: string;
  prompt: string;
  hints: string[];
  order: number;
  points: number;
  hintPenalty: number;
  isPublished: boolean;
  hasFlag: boolean;
  description?: string;
}

export interface CourseDetail extends Course {
  modules: Module[];
}

export interface ModuleDetail extends Module {
  tasks: Task[];
}

export interface Room {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  isPublic: boolean;
  createdAt: string;
}

export interface RoomWithTasks extends Room {
  tasks: Task[];
}