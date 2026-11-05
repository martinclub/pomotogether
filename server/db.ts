import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export interface UpsertDiscordUserData {
  discordId: string;
  username: string;
  avatar?: string | null;
  globalName?: string | null;
}

export async function upsertDiscordUser(data: UpsertDiscordUserData) {
  return await prisma.user.upsert({
    where: { discordId: data.discordId },
    update: {
      username: data.username,
      avatar: data.avatar,
      globalName: data.globalName,
    },
    create: {
      discordId: data.discordId,
      username: data.username,
      avatar: data.avatar,
      globalName: data.globalName,
      level: 1,
      xp: 0,
      currentStreak: 0,
      highestStreak: 0,
      lastActiveDate: null,
    },
  });
}

export function calculateLevel(xp: number): number {
  // 250 XP per level
  return Math.floor(xp / 250) + 1;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

export function isYesterday(past: Date, today: Date): boolean {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const utcPast = Date.UTC(past.getUTCFullYear(), past.getUTCMonth(), past.getUTCDate());
  const utcToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return utcToday - utcPast === oneDayMs;
}

export function getEffectiveStreak(currentStreak: number, lastActiveDate: Date | null | undefined): number {
  if (!lastActiveDate || currentStreak <= 0) return 0;
  const now = new Date();
  if (isSameDay(lastActiveDate, now) || isYesterday(lastActiveDate, now)) {
    return currentStreak;
  }
  return 0;
}

export async function recordUserStudySession(params: {
  userId: string;
  minutes: number;
  mode: string;
  taskTitle?: string | null;
}) {
  const { userId, minutes, mode, taskTitle } = params;

  // Retrieve user to update stats
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  const now = new Date();
  let currentStreak = user.currentStreak;
  let highestStreak = user.highestStreak;

  if (!user.lastActiveDate) {
    currentStreak = 1;
  } else if (isSameDay(user.lastActiveDate, now)) {
    // Already studied today, maintain current streak
    if (currentStreak === 0) currentStreak = 1;
  } else if (isYesterday(user.lastActiveDate, now)) {
    // Studied yesterday, increment streak
    currentStreak += 1;
  } else {
    // Missed at least one day, reset to 1
    currentStreak = 1;
  }

  highestStreak = Math.max(highestStreak, currentStreak);
  const earnedXp = Math.max(10, minutes * 10); // 10 XP per minute
  const newXp = user.xp + earnedXp;
  const newLevel = calculateLevel(newXp);

  const [session, updatedUser] = await prisma.$transaction([
    prisma.studySession.create({
      data: {
        userId,
        minutes,
        mode,
        taskTitle,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel,
        currentStreak,
        highestStreak,
        lastActiveDate: now,
      },
    }),
  ]);

  return { session, user: updatedUser, earnedXp };
}

export function getLeaderboardStartDate(timeframe: 'weekly' | 'monthly' | 'yearly'): Date {
  const now = new Date();
  if (timeframe === 'weekly') {
    // Sunday 00:00:00 UTC of current week
    const day = now.getUTCDay(); // 0 is Sunday
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day, 0, 0, 0, 0));
    return start;
  } else if (timeframe === 'monthly') {
    // 1st of current month
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  } else {
    // Jan 1st of current year
    return new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
  }
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  discordId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  level: number;
  xp: number;
  currentStreak: number;
  highestStreak: number;
  totalMinutes: number;
  sessionsCount: number;
}

export async function getLeaderboard(timeframe: 'weekly' | 'monthly' | 'yearly'): Promise<LeaderboardEntry[]> {
  const startDate = getLeaderboardStartDate(timeframe);

  // Fetch users with their sessions filtered by startDate
  const users = await prisma.user.findMany({
    include: {
      studySessions: {
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      },
    },
  });

  const ranked: LeaderboardEntry[] = users
    .map((u) => {
      const totalMinutes = u.studySessions.reduce((acc, s) => acc + s.minutes, 0);
      const effectiveStreak = getEffectiveStreak(u.currentStreak, u.lastActiveDate);
      return {
        rank: 0,
        id: u.id,
        discordId: u.discordId,
        username: u.username,
        globalName: u.globalName,
        avatar: u.avatar,
        level: u.level,
        xp: u.xp,
        currentStreak: effectiveStreak,
        highestStreak: u.highestStreak,
        totalMinutes,
        sessionsCount: u.studySessions.length,
      };
    })
    .filter((entry) => entry.totalMinutes > 0)
    // Sort by totalMinutes descending, then XP descending
    .sort((a, b) => {
      if (b.totalMinutes !== a.totalMinutes) {
        return b.totalMinutes - a.totalMinutes;
      }
      return b.xp - a.xp;
    })
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

  return ranked;
}

export async function getUserHeatmap(userId: string) {
  const oneYearAgo = new Date();
  oneYearAgo.setUTCDate(oneYearAgo.getUTCDate() - 365);
  oneYearAgo.setUTCHours(0, 0, 0, 0);

  const sessions = await prisma.studySession.findMany({
    where: {
      userId,
      createdAt: {
        gte: oneYearAgo,
      },
    },
    select: {
      minutes: true,
      createdAt: true,
    },
  });

  const map: Record<string, { minutes: number; count: number }> = {};

  sessions.forEach((s) => {
    const key = s.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!map[key]) {
      map[key] = { minutes: 0, count: 0 };
    }
    map[key].minutes += s.minutes;
    map[key].count += 1;
  });

  return map;
}
