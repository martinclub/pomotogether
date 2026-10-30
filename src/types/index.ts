export type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export interface Task {
  id: string;
  title: string;
  act: number;
  est: number;
  notes?: string;
  project?: string;
  completed: boolean;
  createdAt: number;
}

export type AlarmSound = 'bell' | 'digital' | 'gong' | 'chime';
export type TickingSound = 'none' | 'fast' | 'slow';
export type ColorTheme = 'classic' | 'cockpit' | 'forest' | 'sunset';

export interface UserSettings {
  pomodoroTime: number; // in minutes
  shortBreakTime: number; // in minutes
  longBreakTime: number; // in minutes
  longBreakInterval: number; // cycles
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  alarmSound: AlarmSound;
  alarmVolume: number; // 0 to 100
  tickingSound: TickingSound;
  clickSound: boolean;
  colorTheme: ColorTheme;
}

export interface UserStats {
  totalFocusMinutes: number;
  pomodorosCompleted: number;
  currentStreak: number;
  lastActiveDate: string;
  history: Record<string, number>; // YYYY-MM-DD -> focus minutes
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'focusing' | 'shortBreak' | 'longBreak' | 'idle';
  currentTaskTitle?: string;
  completedPomodoros: number;
  isHost: boolean;
  joinedAt: number;
}

export type RoomSyncMode = 'synced' | 'independent';

export interface SyncedTimerState {
  mode: TimerMode;
  timeLeft: number; // seconds
  duration: number; // total duration seconds for current mode
  isRunning: boolean;
  cycle: number;
  updatedAt: number;
}

export interface RoomTimerSettings {
  pomodoroTime: number; // in minutes
  shortBreakTime: number;
  longBreakTime: number;
  longBreakInterval: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomReaction {
  id: string;
  senderName: string;
  emoji: string;
  timestamp: number;
}

export interface RoomState {
  code: string;
  name: string;
  hostId: string;
  syncMode: RoomSyncMode;
  timer: SyncedTimerState;
  timerSettings?: RoomTimerSettings;
  participants: Participant[];
  messages: ChatMessage[];
}

