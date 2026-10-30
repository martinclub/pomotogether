import { io, Socket } from 'socket.io-client';
import { RoomState, ChatMessage, RoomReaction, RoomSyncMode, TimerMode, Participant } from '../types';

let socket: Socket | null = null;

// Determine socket URL based on environment
function getSocketUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  // If Vite dev server on 5173, socket connects to localhost:3001
  if (window.location.port === '5173') {
    return 'http://localhost:3001';
  }
  return window.location.origin;
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to Pomotogether online server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });
  }
  return socket;
}

export const socketService = {
  connect() {
    return getSocket();
  },

  joinRoom(roomCode: string, user: { id: string; name: string; avatar: string }, roomName?: string, syncMode?: RoomSyncMode) {
    const s = getSocket();
    s.emit('join_room', { roomCode, user, roomName, syncMode });
  },

  leaveRoom(roomCode: string) {
    const s = getSocket();
    s.emit('leave_room', { roomCode });
  },

  sendTimerAction(
    roomCode: string,
    action: 'start' | 'pause' | 'skip' | 'reset' | 'set_mode',
    options?: { mode?: TimerMode; timeLeft?: number; duration?: number }
  ) {
    const s = getSocket();
    s.emit('timer_action', {
      roomCode,
      action,
      mode: options?.mode,
      timeLeft: options?.timeLeft,
      duration: options?.duration,
    });
  },

  updateStatus(
    roomCode: string,
    status: 'focusing' | 'shortBreak' | 'longBreak' | 'idle',
    currentTaskTitle?: string,
    completedPomodoros?: number
  ) {
    const s = getSocket();
    s.emit('update_status', {
      roomCode,
      status,
      currentTaskTitle,
      completedPomodoros,
    });
  },

  toggleSyncMode(roomCode: string, syncMode: RoomSyncMode) {
    const s = getSocket();
    s.emit('toggle_sync_mode', { roomCode, syncMode });
  },

  sendChatMessage(roomCode: string, text: string) {
    const s = getSocket();
    s.emit('send_chat', { roomCode, text });
  },

  sendReaction(roomCode: string, emoji: string) {
    const s = getSocket();
    s.emit('send_reaction', { roomCode, emoji });
  },

  onRoomState(callback: (room: RoomState) => void) {
    const s = getSocket();
    s.on('room_state', callback);
    return () => s.off('room_state', callback);
  },

  onRoomMessage(callback: (msg: ChatMessage) => void) {
    const s = getSocket();
    s.on('room_message', callback);
    return () => s.off('room_message', callback);
  },

  onRoomReaction(callback: (reaction: RoomReaction) => void) {
    const s = getSocket();
    s.on('room_reaction', callback);
    return () => s.off('room_reaction', callback);
  },

  onParticipantsUpdated(callback: (data: { participants: Participant[] }) => void) {
    const s = getSocket();
    s.on('room_participants_updated', callback);
    return () => s.off('room_participants_updated', callback);
  },

  onTimerTick(callback: (data: { timeLeft: number; updatedAt: number }) => void) {
    const s = getSocket();
    s.on('room_timer_tick', callback);
    return () => s.off('room_timer_tick', callback);
  },

  onTimerCompleted(callback: (data: { room: RoomState }) => void) {
    const s = getSocket();
    s.on('room_timer_completed', callback);
    return () => s.off('room_timer_completed', callback);
  },
};
