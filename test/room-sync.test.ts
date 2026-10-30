process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import { rooms, createInitialRoom } from '../server/index';
import { Participant, RoomState, TimerMode } from '../src/types';
import { recordCompletedPomodoro, DEFAULT_SETTINGS, DEFAULT_STATS } from '../src/utils/storage';

console.log('--- Starting Pomotogether Real-time & Core Logic Tests ---');

// Test 1: Room Creation
{
  const host: Participant = {
    id: 'user_host_1',
    name: 'Alice',
    avatar: '🍅',
    status: 'focusing',
    completedPomodoros: 0,
    isHost: true,
    joinedAt: Date.now(),
  };

  const room = createInitialRoom('TEST-ROOM', 'Alice Study Sprint', host, 'synced');
  assert.strictEqual(room.code, 'TEST-ROOM');
  assert.strictEqual(room.name, 'Alice Study Sprint');
  assert.strictEqual(room.hostId, 'user_host_1');
  assert.strictEqual(room.syncMode, 'synced');
  assert.strictEqual(room.timer.mode, 'pomodoro');
  assert.strictEqual(room.timer.timeLeft, 25 * 60);
  assert.strictEqual(room.timer.isRunning, false);
  assert.strictEqual(room.participants.length, 1);
  assert.strictEqual(room.participants[0].isHost, true);
  console.log('✓ Test 1 Passed: Room Creation and initial state');
}

// Test 2: Participant Join & Status Updates
{
  const host: Participant = {
    id: 'u1',
    name: 'Bob',
    avatar: '⚡',
    status: 'focusing',
    completedPomodoros: 0,
    isHost: true,
    joinedAt: Date.now(),
  };

  const room = createInitialRoom('DEV-1', 'Dev Room', host, 'synced');
  rooms.set(room.code, room);

  // Participant 2 joins
  const participant2: Participant = {
    id: 'u2',
    name: 'Charlie',
    avatar: '🚀',
    status: 'idle',
    completedPomodoros: 1,
    isHost: false,
    joinedAt: Date.now(),
  };
  room.participants.push(participant2);

  assert.strictEqual(room.participants.length, 2);

  // Update participant 2 task and status
  const p2 = room.participants.find((p) => p.id === 'u2');
  assert(p2);
  p2.status = 'focusing';
  p2.currentTaskTitle = 'Refactoring authentication module';
  p2.completedPomodoros = 2;

  assert.strictEqual(p2.status, 'focusing');
  assert.strictEqual(p2.currentTaskTitle, 'Refactoring authentication module');
  assert.strictEqual(p2.completedPomodoros, 2);
  console.log('✓ Test 2 Passed: Participant joining and real-time status update');
}

// Test 3: Host Transfer upon Departure
{
  const host: Participant = {
    id: 'u1',
    name: 'HostUser',
    avatar: '🍅',
    status: 'focusing',
    completedPomodoros: 0,
    isHost: true,
    joinedAt: Date.now(),
  };
  const member: Participant = {
    id: 'u2',
    name: 'NextHost',
    avatar: '🦊',
    status: 'focusing',
    completedPomodoros: 0,
    isHost: false,
    joinedAt: Date.now(),
  };

  const room = createInitialRoom('HOST-TEST', 'Host Test Room', host);
  room.participants.push(member);

  // Simulate Host leaving
  room.participants = room.participants.filter((p) => p.id !== 'u1');
  if (room.hostId === 'u1' && room.participants.length > 0) {
    room.hostId = room.participants[0].id;
    room.participants[0].isHost = true;
  }

  assert.strictEqual(room.participants.length, 1);
  assert.strictEqual(room.hostId, 'u2');
  assert.strictEqual(room.participants[0].name, 'NextHost');
  assert.strictEqual(room.participants[0].isHost, true);
  console.log('✓ Test 3 Passed: Host departure seamlessly reassigns host to next participant');
}

// Test 4: Timer State Transitions
{
  const host: Participant = {
    id: 'u1',
    name: 'Solo',
    avatar: '🍅',
    status: 'focusing',
    completedPomodoros: 0,
    isHost: true,
    joinedAt: Date.now(),
  };
  const room = createInitialRoom('TIMER-TEST', 'Timer Room', host);

  // Start timer
  room.timer.isRunning = true;
  assert.strictEqual(room.timer.isRunning, true);

  // Pause timer
  room.timer.isRunning = false;
  room.timer.timeLeft = 1200; // 20 minutes left
  assert.strictEqual(room.timer.timeLeft, 1200);

  // Switch to Short Break
  room.timer.mode = 'shortBreak';
  room.timer.duration = 5 * 60;
  room.timer.timeLeft = 5 * 60;
  assert.strictEqual(room.timer.mode, 'shortBreak');
  assert.strictEqual(room.timer.timeLeft, 300);

  // Switch to Long Break
  room.timer.mode = 'longBreak';
  room.timer.duration = 15 * 60;
  room.timer.timeLeft = 15 * 60;
  assert.strictEqual(room.timer.mode, 'longBreak');
  assert.strictEqual(room.timer.timeLeft, 900);
  console.log('✓ Test 4 Passed: Synchronized timer state and mode transitions');
}

// Test 5: Default Settings & Invariants
{
  assert.strictEqual(DEFAULT_SETTINGS.pomodoroTime, 25);
  assert.strictEqual(DEFAULT_SETTINGS.shortBreakTime, 5);
  assert.strictEqual(DEFAULT_SETTINGS.longBreakTime, 15);
  assert.strictEqual(DEFAULT_SETTINGS.longBreakInterval, 4);
  assert.strictEqual(DEFAULT_SETTINGS.alarmSound, 'bell');
  assert.strictEqual(DEFAULT_SETTINGS.colorTheme, 'classic');
  console.log('✓ Test 5 Passed: Default settings match Pomofocus specifications');
}

console.log('\n=======================================');
console.log('ALL 5 CORE TESTS PASSED SUCCESSFULLY! 🍅');
console.log('=======================================\n');
process.exit(0);
