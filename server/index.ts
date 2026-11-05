import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { RoomState, Participant, TimerMode, RoomSyncMode, ChatMessage, RoomReaction, RoomTimerSettings } from '../src/types';
import { prisma, upsertDiscordUser, recordUserStudySession, getLeaderboard, getUserHeatmap, getEffectiveStreak } from './db.js';
import { initDiscordBot } from './bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'pomotogether_secret_key_jwt';

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend build if dist exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

// In-memory rooms repository
export const rooms = new Map<string, RoomState>();

// Helper to create initial room state
export function createInitialRoom(
  code: string,
  name: string,
  host: Participant,
  syncMode: RoomSyncMode = 'synced',
  timerSettings?: RoomTimerSettings
): RoomState {
  const pTime = timerSettings?.pomodoroTime || 25;
  return {
    code: code.toUpperCase().trim(),
    name: name.trim() || `Room ${code.toUpperCase()}`,
    hostId: host.id,
    syncMode,
    timerSettings: timerSettings || {
      pomodoroTime: 25,
      shortBreakTime: 5,
      longBreakTime: 15,
      longBreakInterval: 4,
    },
    timer: {
      mode: 'pomodoro',
      timeLeft: pTime * 60,
      duration: pTime * 60,
      isRunning: false,
      cycle: 1,
      updatedAt: Date.now(),
    },
    participants: [host],
    messages: [
      {
        id: `sys-${Date.now()}`,
        senderId: 'system',
        senderName: 'Pomotogether',
        senderAvatar: '🍅',
        text: `Room created! Welcome ${host.name}! Share code "${code.toUpperCase()}" with friends to study together.`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ],
  };
}

// Server-side ticker to maintain precision for synced timer rooms
const roomTicker = setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomCode) => {
    if (room.syncMode === 'synced' && room.timer.isRunning) {
      if (room.timer.timeLeft > 0) {
        room.timer.timeLeft -= 1;
        room.timer.updatedAt = now;

        // Broadcast tick every 5 seconds or when timer reaches 0 to reduce spam
        if (room.timer.timeLeft === 0) {
          room.timer.isRunning = false;
          const sets = room.timerSettings || {
            pomodoroTime: 25,
            shortBreakTime: 5,
            longBreakTime: 15,
            longBreakInterval: 4,
          };

          let nextMode: TimerMode = 'shortBreak';
          let nextDuration = sets.shortBreakTime * 60;
          let nextCycle = room.timer.cycle;

          if (room.timer.mode === 'pomodoro') {
            if (room.timer.cycle % sets.longBreakInterval === 0) {
              nextMode = 'longBreak';
              nextDuration = sets.longBreakTime * 60;
            } else {
              nextMode = 'shortBreak';
              nextDuration = sets.shortBreakTime * 60;
            }
          } else {
            nextMode = 'pomodoro';
            nextDuration = sets.pomodoroTime * 60;
            nextCycle += 1;
          }

          room.timer.mode = nextMode;
          room.timer.duration = nextDuration;
          room.timer.timeLeft = nextDuration;
          room.timer.cycle = nextCycle;

          // Add system message
          const sysMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            senderId: 'system',
            senderName: 'Pomotogether',
            senderAvatar: '🍅',
            text: nextMode === 'pomodoro' ? `Cycle #${nextCycle} started! Time to focus!` : `Great job! Time for a break!`,
            timestamp: Date.now(),
            isSystem: true,
          };
          room.messages.push(sysMsg);
          if (room.messages.length > 100) room.messages.shift();

          io.to(roomCode).emit('room_timer_completed', { room });
        } else if (room.timer.timeLeft % 5 === 0) {
          io.to(roomCode).emit('room_timer_tick', {
            timeLeft: room.timer.timeLeft,
            updatedAt: room.timer.updatedAt,
          });
        }
      }
    }
  });
}, 1000);
roomTicker.unref();

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    roomsCount: rooms.size,
    timestamp: Date.now(),
  });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({
    code: room.code,
    name: room.name,
    participantsCount: room.participants.length,
    syncMode: room.syncMode,
    timer: room.timer,
  });
});

// Auth token middleware
export function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = decoded;
    next();
  });
}

// 1. Discord OAuth2 Authorize Redirect
app.get('/api/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'DISCORD_CLIENT_ID not configured' });
  }
  const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/api/auth/discord/callback`;
  const returnTo = (req.query.return_to as string) || req.headers.referer || '';
  const state = returnTo ? encodeURIComponent(returnTo) : '';
  const stateParam = state ? `&state=${state}` : '';
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=identify%20email${stateParam}`;
  res.redirect(url);
});

// 2. Discord OAuth2 Callback
app.get('/api/auth/discord/callback', async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Missing Discord authorization code');
  }

  try {
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
    const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/api/auth/discord/callback`;

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: tokenParams,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Discord OAuth] Exchange error:', errText);
      return res.status(400).send(`Discord authentication failed: ${errText}`);
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userRes.ok) {
      return res.status(400).send('Failed to fetch Discord user information');
    }

    const discordUser = await userRes.json();
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${(BigInt(discordUser.id || '0') >> 22n) % 6n}.png`;

    const user = await upsertDiscordUser({
      discordId: discordUser.id,
      username: discordUser.username,
      avatar: avatarUrl,
      globalName: discordUser.global_name,
    });

    const token = jwt.sign(
      {
        id: user.id,
        discordId: user.discordId,
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Determine target origin to return to
    const rawState = req.query.state as string;
    let targetBase = '';
    if (rawState) {
      try {
        const decoded = decodeURIComponent(rawState);
        const urlObj = new URL(decoded);
        targetBase = `${urlObj.protocol}//${urlObj.host}`;
      } catch {}
    }

    if (!targetBase) {
      const isDev = process.env.NODE_ENV === 'development';
      targetBase = isDev ? 'http://localhost:5173' : '';
    }
    res.redirect(`${targetBase}/?token=${token}`);
  } catch (error: any) {
    console.error('[Discord OAuth] Internal error:', error);
    res.status(500).send('Internal server error during Discord authentication');
  }
});

// 3. Mock login for tests/local development without active Discord redirect
app.post('/api/auth/mock-login', async (req, res) => {
  const { discordId, username, avatar, globalName } = req.body;
  if (!discordId || !username) {
    return res.status(400).json({ error: 'discordId and username are required' });
  }

  const user = await upsertDiscordUser({
    discordId,
    username,
    avatar: avatar || '🍅',
    globalName: globalName || username,
  });

  const token = jwt.sign(
    {
      id: user.id,
      discordId: user.discordId,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token, user });
});

// 4. Current authenticated user profile & heatmap
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const payload = (req as any).user;
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        studySessions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const effectiveStreak = getEffectiveStreak(user.currentStreak, user.lastActiveDate);
    const userWithEffectiveStreak = {
      ...user,
      currentStreak: effectiveStreak,
    };

    const heatmap = await getUserHeatmap(user.id);
    res.json({ user: userWithEffectiveStreak, heatmap });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Study session recording endpoint
app.post('/api/study-session', authenticateToken, async (req, res) => {
  try {
    const payload = (req as any).user;
    const { minutes, mode, taskTitle } = req.body;
    if (!minutes || typeof minutes !== 'number') {
      return res.status(400).json({ error: 'minutes is required and must be a number' });
    }

    const result = await recordUserStudySession({
      userId: payload.id,
      minutes,
      mode: mode || 'pomodoro',
      taskTitle: taskTitle || null,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    const rawParam = ((req.query.timeframe as string) || '').toLowerCase().trim();
    let timeframe: 'weekly' | 'monthly' | 'yearly' = 'weekly';
    if (rawParam === 'monthly') {
      timeframe = 'monthly';
    } else if (rawParam === 'yearly' || rawParam === 'current year' || rawParam === 'current_year' || rawParam === 'annual') {
      timeframe = 'yearly';
    } else {
      timeframe = 'weekly';
    }

    const leaderboard = await getLeaderboard(timeframe);
    res.json({ timeframe, leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Heatmap endpoint for specific user
app.get('/api/users/:userId/heatmap', async (req, res) => {
  try {
    const heatmap = await getUserHeatmap(req.params.userId);
    res.json({ heatmap });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback for SPA routing if dist exists
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Pomotogether Server Running. Vite dev server runs at http://localhost:5173');
    }
  });
});

// Socket.io handlers
io.on('connection', (socket: Socket) => {
  let currentRoomCode: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join_room', ({
    roomCode,
    user,
    roomName,
    syncMode,
    timerSettings,
  }: {
    roomCode: string;
    user: { id: string; name: string; avatar: string };
    roomName?: string;
    syncMode?: RoomSyncMode;
    timerSettings?: RoomTimerSettings;
  }) => {
    const code = roomCode.toUpperCase().trim();
    currentRoomCode = code;
    currentUserId = user.id;

    let room = rooms.get(code);
    if (!room) {
      // First person to join is host
      const host: Participant = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        status: 'focusing',
        completedPomodoros: 0,
        isHost: true,
        joinedAt: Date.now(),
      };
      room = createInitialRoom(code, roomName || `Room ${code}`, host, syncMode || 'synced', timerSettings);
      rooms.set(code, room);
    } else {
      // Existing room: update timerSettings if provided by host
      if (timerSettings && room.hostId === user.id) {
        room.timerSettings = timerSettings;
      }

      // Check if participant already in list
      const existingIdx = room.participants.findIndex((p) => p.id === user.id);
      if (existingIdx >= 0) {
        room.participants[existingIdx].name = user.name;
        room.participants[existingIdx].avatar = user.avatar;
      } else {
        const participant: Participant = {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          status: 'focusing',
          completedPomodoros: 0,
          isHost: room.participants.length === 0,
          joinedAt: Date.now(),
        };
        room.participants.push(participant);

        const joinMsg: ChatMessage = {
          id: `sys-${Date.now()}-${Math.random()}`,
          senderId: 'system',
          senderName: 'Pomotogether',
          senderAvatar: user.avatar,
          text: `${user.name} joined the room!`,
          timestamp: Date.now(),
          isSystem: true,
        };
        room.messages.push(joinMsg);
        if (room.messages.length > 100) room.messages.shift();
      }
    }

    socket.join(code);
    // Send full room state to newly joined client
    socket.emit('room_state', room);
    // Notify room of participant update
    socket.to(code).emit('room_state', room);
  });

  socket.on('timer_action', ({
    roomCode,
    action,
    mode,
    timeLeft,
    duration,
    cycle,
  }: {
    roomCode: string;
    action: 'start' | 'pause' | 'skip' | 'reset' | 'set_mode';
    mode?: TimerMode;
    timeLeft?: number;
    duration?: number;
    cycle?: number;
  }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    if (action === 'start') {
      room.timer.isRunning = true;
      if (typeof timeLeft === 'number') room.timer.timeLeft = timeLeft;
      if (typeof duration === 'number') room.timer.duration = duration;
      if (typeof cycle === 'number') room.timer.cycle = cycle;
      room.timer.updatedAt = Date.now();
    } else if (action === 'pause') {
      room.timer.isRunning = false;
      if (typeof timeLeft === 'number') room.timer.timeLeft = timeLeft;
      if (typeof duration === 'number') room.timer.duration = duration;
      if (typeof cycle === 'number') room.timer.cycle = cycle;
      room.timer.updatedAt = Date.now();
    } else if (action === 'skip' || action === 'reset' || action === 'set_mode') {
      room.timer.isRunning = false;
      if (mode) room.timer.mode = mode;
      if (typeof duration === 'number') room.timer.duration = duration;
      if (typeof timeLeft === 'number') {
        room.timer.timeLeft = timeLeft;
      } else if (typeof duration === 'number') {
        room.timer.timeLeft = duration;
      }
      if (typeof cycle === 'number') room.timer.cycle = cycle;
      room.timer.updatedAt = Date.now();
    }

    io.to(code).emit('room_state', room);
  });

  socket.on(
    'update_status',
    ({
      roomCode,
      status,
      currentTaskTitle,
      completedPomodoros,
      taskAct,
      taskEst,
      remainingStudyPomodoros,
    }: {
      roomCode: string;
      status: 'focusing' | 'shortBreak' | 'longBreak' | 'idle';
      currentTaskTitle?: string;
      completedPomodoros?: number;
      taskAct?: number;
      taskEst?: number;
      remainingStudyPomodoros?: number;
    }) => {
      const code = roomCode.toUpperCase();
      const room = rooms.get(code);
      if (!room || !currentUserId) return;

      const p = room.participants.find((p) => p.id === currentUserId);
      if (p) {
        p.status = status;
        p.currentTaskTitle = currentTaskTitle || undefined;
        if (completedPomodoros !== undefined) p.completedPomodoros = completedPomodoros;
        p.taskAct = typeof taskAct === 'number' ? taskAct : undefined;
        p.taskEst = typeof taskEst === 'number' ? taskEst : undefined;
        p.remainingStudyPomodoros = typeof remainingStudyPomodoros === 'number' ? remainingStudyPomodoros : undefined;

        io.to(code).emit('room_participants_updated', { participants: room.participants });
      }
    }
  );

  socket.on('toggle_sync_mode', ({ roomCode, syncMode }: { roomCode: string; syncMode: RoomSyncMode }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;
    room.syncMode = syncMode;
    io.to(code).emit('room_state', room);
  });

  socket.on('send_chat', ({ roomCode, text }: { roomCode: string; text: string }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room || !currentUserId || !text.trim()) return;

    // Enforce Focus Chat Lock on server for synced rooms
    if (room.syncMode === 'synced' && room.timer.isRunning && room.timer.mode === 'pomodoro') {
      return;
    }

    const sender = room.participants.find((p) => p.id === currentUserId);
    if (!sender) return;

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatar,
      text: text.trim().slice(0, 300),
      timestamp: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 100) room.messages.shift();

    io.to(code).emit('room_message', message);
  });

  socket.on('send_reaction', ({ roomCode, emoji }: { roomCode: string; emoji: string }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room || !currentUserId) return;

    const sender = room.participants.find((p) => p.id === currentUserId);
    const reaction: RoomReaction = {
      id: `react-${Date.now()}-${Math.random()}`,
      senderName: sender ? sender.name : 'A friend',
      emoji,
      timestamp: Date.now(),
    };

    io.to(code).emit('room_reaction', reaction);
  });

  socket.on('leave_room', ({ roomCode }: { roomCode: string }) => {
    handleLeaveRoom(socket, roomCode.toUpperCase(), currentUserId);
    currentRoomCode = null;
  });

  socket.on('disconnect', () => {
    if (currentRoomCode && currentUserId) {
      handleLeaveRoom(socket, currentRoomCode, currentUserId);
    }
  });
});

function handleLeaveRoom(socket: Socket, roomCode: string, userId: string | null) {
  if (!userId) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  const leavingParticipant = room.participants.find((p) => p.id === userId);
  room.participants = room.participants.filter((p) => p.id !== userId);

  socket.leave(roomCode);

  if (room.participants.length === 0) {
    // Clean up empty room
    rooms.delete(roomCode);
  } else {
    // If the host left, assign host to first remaining participant
    if (room.hostId === userId) {
      room.hostId = room.participants[0].id;
      room.participants[0].isHost = true;
    }

    if (leavingParticipant) {
      const leaveMsg: ChatMessage = {
        id: `sys-${Date.now()}-${Math.random()}`,
        senderId: 'system',
        senderName: 'Pomotogether',
        senderAvatar: leavingParticipant.avatar,
        text: `${leavingParticipant.name} left the room.`,
        timestamp: Date.now(),
        isSystem: true,
      };
      room.messages.push(leaveMsg);
      if (room.messages.length > 100) room.messages.shift();
    }

    io.to(roomCode).emit('room_state', room);
  }
}

// Start server if run directly
const isTestRun = process.env.NODE_ENV === 'test' || process.argv.some((arg) => arg.includes('test'));
if (!isTestRun) {
  server.listen(PORT, () => {
    console.log(`[Pomotogether] Real-time Server running on port ${PORT}`);
    initDiscordBot();
  });
}

export { app, server, io };
