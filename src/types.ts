export type PeakEnergyTime = 'Morning' | 'Afternoon' | 'Night';

export interface UserProfile {
  uid: string;
  email: string;
  studyHoursPerDay: number;
  peakEnergyTime: PeakEnergyTime;
  displayName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  examDate: string; // YYYY-MM-DD
  difficulty: number; // 1 to 10
  priorityScore?: number;
  createdAt?: string;
}

export type TaskStatus = 'scheduled' | 'completed' | 'missed' | 'rescheduled';

export interface StudyTask {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  durationHours: number;
  date: string;      // YYYY-MM-DD
  status: TaskStatus;
  isPeakEnergy?: boolean;
  difficulty?: number;
  priorityScore?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchedulingResult {
  success: boolean;
  tasks: StudyTask[];
  count?: number;
  error?: string;
}

export interface AdjustmentResult {
  success: boolean;
  missedTaskId?: string;
  missedHoursRedistributed?: number;
  rescheduledTasksCount?: number;
  newTasks?: StudyTask[];
  tasks: StudyTask[];
  error?: string;
}
