export type DashboardId = 'BriggsDavis' | 'Work' | 'Esade' | 'Ennova' | 'Personal';

export interface Task {
  id: string;
  content: string;
  completed: boolean;
  dashboardId: DashboardId;
  createdAt: number;
}

export interface DashboardState {
  id: DashboardId;
  label: string;
  color: string;
  minimized: boolean;
}

export const DASHBOARDS: DashboardState[] = [
  { id: 'BriggsDavis', label: 'BriggsDavis', color: '#A855F7', minimized: false }, // Purple
  { id: 'Work', label: 'Work', color: '#22C55E', minimized: false }, // Green
  { id: 'Esade', label: 'Esade', color: '#60A5FA', minimized: false }, // Light Blue
  { id: 'Ennova', label: 'Ennova', color: '#1E40AF', minimized: false }, // Dark Blue
  { id: 'Personal', label: 'Personal', color: '#F97316', minimized: false }, // Orange
];

export const SHORTCUT_MAP: Record<string, DashboardId> = {
  b: 'BriggsDavis',
  w: 'Work',
  e: 'Esade',
  n: 'Ennova',
  p: 'Personal',
};
