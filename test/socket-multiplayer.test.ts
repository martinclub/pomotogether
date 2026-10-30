process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { rooms, createInitialRoom } from '../server/index';
import { Participant, RoomState, ChatMessage, RoomReaction } from '../src/types';

console.log('--- Starting Deep Multi-Client WebSocket Integration Tests ---');

// We will launch a test instance of the server on port 4005
const app = express();
const httpServer = createServer(app);
const ioServer = new Server(httpServer, {
  cors: { origin: '*' }
});

const TEST_PORT = 4005;

// Mirror server logic for isolated deterministic integration test
ioServer.on('connection', (socket) => {
  let currentRoomCode: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join_room', ({ roomCode, user, roomName, syncMode }) => {
    const code = roomCode.toUpperCase().trim();
    currentRoomCode = code;
    currentUserId = user.id;

    let room = rooms.get(code);
    if (!room) {
      const host: Participant = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        status: 'focusing',
        completedPomodoros: 0,
        isHost: true,
        joinedAt: Date.now(),
      };
      room = createInitialRoom(code, roomName || `Room ${code}`, host, syncMode || 'synced');
      rooms.set(code, room);
    } else {
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
      }
    }

    socket.join(code);
    socket.emit('room_state', room);
    socket.to(code).emit('room_state', room);
  });

  socket.on('timer_action', ({ roomCode, action, mode, timeLeft, duration, cycle }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room) return;

    if (action === 'start') {
      room.timer.isRunning = true;
      if (typeof timeLeft === 'number') room.timer.timeLeft = timeLeft;
      room.timer.updatedAt = Date.now();
    } else if (action === 'pause') {
      room.timer.isRunning = false;
      if (typeof timeLeft === 'number') room.timer.timeLeft = timeLeft;
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

    ioServer.to(code).emit('room_state', room);
  });

  socket.on('update_status', ({ roomCode, status, currentTaskTitle, completedPomodoros }) => {
    const code = roomCode.toUpperCase();
    const room = rooms.get(code);
    if (!room || !currentUserId) return;

    const p = room.participants.find((p) => p.id === currentUserId);
    if (p) {
      p.status = status;
      if (currentTaskTitle !== undefined) p.currentTaskTitle = currentTaskTitle;
      if (completedPomodoros !== undefined) p.completedPomodoros = completedPomodoros;

      ioServer.to(code).emit('room_participants_updated', { participants: room.participants });
    }
  });

  socket.on('send_chat', ({ roomCode, text }) => {
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
    ioServer.to(code).emit('room_message', message);
  });

  socket.on('send_reaction', ({ roomCode, emoji }) => {
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

    ioServer.to(code).emit('room_reaction', reaction);
  });

  socket.on('disconnect', () => {
    if (currentRoomCode && currentUserId) {
      const room = rooms.get(currentRoomCode);
      if (!room) return;

      room.participants = room.participants.filter((p) => p.id !== currentUserId);
      if (room.participants.length === 0) {
        rooms.delete(currentRoomCode);
      } else {
        if (room.hostId === currentUserId) {
          room.hostId = room.participants[0].id;
          room.participants[0].isHost = true;
        }
        ioServer.to(currentRoomCode).emit('room_state', room);
      }
    }
  });
});

async function run() {
  await new Promise<void>((resolve) => httpServer.listen(TEST_PORT, () => resolve()));
  console.log(`Test WebSocket Server listening on port ${TEST_PORT}`);

  const serverUrl = `http://localhost:${TEST_PORT}`;

  // Client 1 (Alice / Host)
  const client1 = Client(serverUrl, { reconnection: false });
  // Client 2 (Bob / Member)
  const client2 = Client(serverUrl, { reconnection: false });

  await Promise.all([
    new Promise((resolve) => client1.on('connect', () => resolve(undefined))),
    new Promise((resolve) => client2.on('connect', () => resolve(undefined))),
  ]);
  console.log('✓ Both Socket.io test clients connected successfully.');

  const ROOM_CODE = 'SPRINT-99';

  // Step 1: Alice joins and creates room
  const aliceRoomStatePromise = new Promise<RoomState>((resolve) => {
    client1.once('room_state', resolve);
  });

  client1.emit('join_room', {
    roomCode: ROOM_CODE,
    user: { id: 'alice_1', name: 'Alice', avatar: '👩‍💻' },
    roomName: 'Sprint Room',
    syncMode: 'synced',
  });

  const state1 = await aliceRoomStatePromise;
  assert.strictEqual(state1.code, ROOM_CODE);
  assert.strictEqual(state1.hostId, 'alice_1');
  assert.strictEqual(state1.participants.length, 1);
  console.log('✓ Step 1: Host created room and received state.');

  // Step 2: Bob joins room
  const bobRoomStatePromise = new Promise<RoomState>((resolve) => {
    client2.once('room_state', resolve);
  });
  const aliceSeesBobPromise = new Promise<RoomState>((resolve) => {
    client1.once('room_state', resolve);
  });

  client2.emit('join_room', {
    roomCode: ROOM_CODE,
    user: { id: 'bob_2', name: 'Bob', avatar: '🚀' },
  });

  const [bobState, aliceUpdatedState] = await Promise.all([bobRoomStatePromise, aliceSeesBobPromise]);
  assert.strictEqual(bobState.participants.length, 2);
  assert.strictEqual(aliceUpdatedState.participants.length, 2);
  assert.strictEqual(bobState.hostId, 'alice_1');
  console.log('✓ Step 2: Bob joined; both clients synced 2 participants.');

  // Step 3: Real-time Chat
  const chatPromise = new Promise<ChatMessage>((resolve) => {
    client1.once('room_message', resolve);
  });

  client2.emit('send_chat', {
    roomCode: ROOM_CODE,
    text: 'Hello from Bob! Ready to focus.',
  });

  const chatReceived = await chatPromise;
  assert.strictEqual(chatReceived.senderId, 'bob_2');
  assert.strictEqual(chatReceived.text, 'Hello from Bob! Ready to focus.');
  console.log('✓ Step 3: Bob sent chat; Alice received it over WebSocket.');

  // Step 4: Cheer / Reaction broadcast
  const reactionPromise = new Promise<RoomReaction>((resolve) => {
    client2.once('room_reaction', resolve);
  });

  client1.emit('send_reaction', {
    roomCode: ROOM_CODE,
    emoji: '🔥',
  });

  const reactionReceived = await reactionPromise;
  assert.strictEqual(reactionReceived.emoji, '🔥');
  assert.strictEqual(reactionReceived.senderName, 'Alice');
  console.log('✓ Step 4: Alice sent cheer reaction; Bob received it.');

  // Step 5: Host Starts Timer
  const timerStartPromise = new Promise<RoomState>((resolve) => {
    client2.once('room_state', resolve);
  });

  client1.emit('timer_action', {
    roomCode: ROOM_CODE,
    action: 'start',
    timeLeft: 1500,
  });

  const timerStartedState = await timerStartPromise;
  assert.strictEqual(timerStartedState.timer.isRunning, true);
  console.log('✓ Step 5: Host started timer; Bob received synchronized timer isRunning=true.');

  // Step 6: Participant Status Update
  const statusUpdatePromise = new Promise<{ participants: Participant[] }>((resolve) => {
    client1.once('room_participants_updated', resolve);
  });

  client2.emit('update_status', {
    roomCode: ROOM_CODE,
    status: 'focusing',
    currentTaskTitle: 'Deep Work Session',
    completedPomodoros: 3,
  });

  const statusUpdate = await statusUpdatePromise;
  const bobInList = statusUpdate.participants.find((p) => p.id === 'bob_2');
  assert(bobInList);
  assert.strictEqual(bobInList.status, 'focusing');
  assert.strictEqual(bobInList.currentTaskTitle, 'Deep Work Session');
  assert.strictEqual(bobInList.completedPomodoros, 3);
  console.log('✓ Step 6: Bob status update broadcasted to room.');

  // Step 7: Host Disconnection and automatic promotion of next participant
  const hostTransferPromise = new Promise<RoomState>((resolve) => {
    client2.once('room_state', resolve);
  });

  client1.disconnect();

  const promotedState = await hostTransferPromise;
  assert.strictEqual(promotedState.participants.length, 1);
  assert.strictEqual(promotedState.hostId, 'bob_2');
  assert.strictEqual(promotedState.participants[0].id, 'bob_2');
  assert.strictEqual(promotedState.participants[0].isHost, true);
  console.log('✓ Step 7: Host disconnected; Bob seamlessly promoted to Room Host.');

  // Step 8: Bob disconnects and empty room cleanup
  client2.disconnect();
  await new Promise((r) => setTimeout(r, 200));
  assert.strictEqual(rooms.has(ROOM_CODE), false);
  console.log('✓ Step 8: Last participant disconnected; room cleanly disposed.');

  httpServer.close();
  console.log('\n======================================================');
  console.log('ALL REAL-TIME MULTIPLAYER INTEGRATION TESTS PASSED! 🚀');
  console.log('======================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
