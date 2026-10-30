import { Task, UserSettings, UserStats } from '../types';

const SETTINGS_KEY = 'pomotogether_settings_v2';
const TASKS_KEY = 'pomotogether_tasks_v2';
const STATS_KEY = 'pomotogether_stats_v2';
const USER_KEY = 'pomotogether_user_v2';

export const DEFAULT_SETTINGS: UserSettings = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  alarmSound: 'bell',
  alarmVolume: 75,
  tickingSound: 'none',
  clickSound: true,
  colorTheme: 'classic',
};

export const DEFAULT_STATS: UserStats = {
  totalFocusMinutes: 0,
  pomodorosCompleted: 0,
  currentStreak: 1,
  lastActiveDate: new Date().toISOString().split('T')[0],
  history: {},
};

export interface LocalUser {
  id: string;
  name: string;
  avatar: string;
}

const AVATARS = ['🍅', '⚡', '☕', '🚀', '🦊', '🦉', '🎯', '🌟', '💻', '💡'];
const NAMES = ['FocusPilot', 'CodeNinja', 'DeepWorker', 'PomoMaster', 'FlowSeeker', 'ZenScholar', 'DailyAchiever'];

export function getOrCreateUser(): LocalUser {
  if (typeof window === 'undefined') {
    return { id: 'user_1', name: 'FocusPilot', avatar: '🍅' };
  }
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }

  const randomName = `${NAMES[Math.floor(Math.random() * NAMES.length)]}#${Math.floor(100 + Math.random() * 900)}`;
  const randomAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const newUser: LocalUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: randomName,
    avatar: randomAvatar,
  };
  saveUser(newUser);
  return newUser;
}

export function saveUser(user: LocalUser) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    // ignore
  }
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: UserSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // ignore
  }
}

export function loadTasks(): Task[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    // fallback
  }
  return [
    {
      id: 'task-1',
      title: 'Welcome to Pomotogether!',
      act: 0,
      est: 2,
      notes: 'Work together with friends in real-time online rooms 🍅',
      completed: false,
      createdAt: Date.now(),
    },
  ];
}

export function saveTasks(tasks: Task[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    // ignore
  }
}

export function loadStats(): UserStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      return { ...DEFAULT_STATS, ...JSON.parse(raw) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_STATS;
}

export function recordCompletedPomodoro(minutes: number): UserStats {
  const current = loadStats();
  const today = new Date().toISOString().split('T')[0];

  const lastDate = current.lastActiveDate;
  let newStreak = current.currentStreak || 1;

  if (lastDate && lastDate !== today) {
    const last = new Date(lastDate).getTime();
    const cur = new Date(today).getTime();
    const diffDays = Math.round((cur - last) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }
  }

  const updatedHistory = { ...current.history };
  updatedHistory[today] = (updatedHistory[today] || 0) + minutes;

  const newStats: UserStats = {
    totalFocusMinutes: current.totalFocusMinutes + minutes,
    pomodorosCompleted: current.pomodorosCompleted + 1,
    currentStreak: newStreak,
    lastActiveDate: today,
    history: updatedHistory,
  };

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
  } catch (e) {
    // ignore
  }
  return newStats;
}
