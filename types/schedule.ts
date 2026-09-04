export type ScheduleCategory = 
  | "focus" 
  | "meeting" 
  | "reflection" 
  | "wellness" 
  | "admin" 
  | "break";

export type ScheduleStatus = 
  | "pending" 
  | "in_progress" 
  | "completed" 
  | "skipped";

export type SchedulePriority = "high" | "medium" | "low";

export interface ScheduleItem {
  id: string;
  startTime: string; // e.g., "08:00"
  endTime: string;   // e.g., "09:00"
  activity: string;
  category: ScheduleCategory;
  status: ScheduleStatus;
  priority?: SchedulePriority;
  notes?: string;
  location?: string;
}

export interface DailySchedule {
  id: string; // Format: YYYY-MM-DD
  userId: string;
  date: string; // Format: YYYY-MM-DD
  title?: string;
  goalOfTheDay?: string;
  items: ScheduleItem[];
  createdAt: number;
  updatedAt: number;
}
