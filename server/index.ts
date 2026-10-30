import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomState, Participant, TimerMode, RoomSyncMode, ChatMessage, RoomReaction, RoomTimerSettings } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
setInterval(() => {
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

  socket.on('update_status', ({ roomCode, status, currentTaskTitle, completedPomodoros }: { roomCode: string; status: 'focusing' | 'shortBreak' | 'longBreak' | 'idle'; currentTaskTitle?: string; completedPomodoros?: number }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room || !currentUserId) return;

    const p = room.participants.find((p) => p.id === currentUserId);
    if (p) {
      p.status = status;
      if (currentTaskTitle !== undefined) p.currentTaskTitle = currentTaskTitle;
      if (completedPomodoros !== undefined) p.completedPomodoros = completedPomodoros;

      io.to(code).emit('room_participants_updated', { participants: room.participants });
    }
  });

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
  });
}

export { app, server, io };
