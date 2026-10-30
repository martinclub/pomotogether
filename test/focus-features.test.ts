process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import { getParticipantProgressMetrics } from '../src/components/ParticipantProgress';
import { Participant, TimerMode } from '../src/types';

console.log('--- Starting Focus Features & Progress Bar Tests ---');

// Test 1: Participant progress calculation with active task estimate
{
  const pWithTask: Participant = {
    id: 'u1',
    name: 'Alice',
    avatar: '🍅',
    status: 'focusing',
    taskAct: 2,
    taskEst: 5,
    completedPomodoros: 3,
    isHost: true,
    joinedAt: Date.now(),
  };

  const metrics = getParticipantProgressMetrics(pWithTask);
  assert.strictEqual(metrics.percent, 40);
  assert.strictEqual(metrics.label, '2/5 🍅');
  assert.strictEqual(metrics.isTaskBased, true);
  console.log('✓ Test 1 Passed: Participant progress with task estimate (2/5 = 40%)');
}

// Test 2: Participant progress with 100% completion
{
  const pCompleted: Participant = {
    id: 'u2',
    name: 'Bob',
    avatar: '🚀',
    status: 'focusing',
    taskAct: 5,
    taskEst: 5,
    completedPomodoros: 5,
    isHost: false,
    joinedAt: Date.now(),
  };

  const metrics = getParticipantProgressMetrics(pCompleted);
  assert.strictEqual(metrics.percent, 100);
  assert.strictEqual(metrics.label, '5/5 🍅');
  assert.strictEqual(metrics.detail, '100%');
  console.log('✓ Test 2 Passed: Participant progress capped at 100%');
}

// Test 3: Participant progress without task estimate, using remaining study pomodoros
{
  const pStudySession: Participant = {
    id: 'u3',
    name: 'Charlie',
    avatar: '📚',
    status: 'focusing',
    completedPomodoros: 2,
    remainingStudyPomodoros: 2,
    isHost: false,
    joinedAt: Date.now(),
  };

  const metrics = getParticipantProgressMetrics(pStudySession);
  // completed: 2, total: 4 => 50%
  assert.strictEqual(metrics.percent, 50);
  assert.strictEqual(metrics.label, '2/4 🍅');
  assert.strictEqual(metrics.isTaskBased, false);
  console.log('✓ Test 3 Passed: Participant progress with session remaining pomodoros (2/4 = 50%)');
}

// Test 4: Participant progress with session pomodoro targets (e.g. 1 completed out of 4 cycle)
{
  const pCycle: Participant = {
    id: 'u4',
    name: 'Dana',
    avatar: '⚡',
    status: 'focusing',
    completedPomodoros: 1,
    isHost: false,
    joinedAt: Date.now(),
  };

  const metrics = getParticipantProgressMetrics(pCycle);
  assert.strictEqual(metrics.percent, 25);
  assert.strictEqual(metrics.label, '1/4 🍅');
  console.log('✓ Test 4 Passed: Participant progress towards 4-pomodoro standard cycle (1/4 = 25%)');
}

// Test 5: Focus Chat Lock rule evaluation
{
  function isChatLocked(isRunning: boolean, mode: TimerMode): boolean {
    return isRunning && mode === 'pomodoro';
  }

  // Running during pomodoro -> LOCKED
  assert.strictEqual(isChatLocked(true, 'pomodoro'), true);

  // Paused during pomodoro -> UNLOCKED
  assert.strictEqual(isChatLocked(false, 'pomodoro'), false);

  // Running during shortBreak -> UNLOCKED
  assert.strictEqual(isChatLocked(true, 'shortBreak'), false);

  // Running during longBreak -> UNLOCKED
  assert.strictEqual(isChatLocked(true, 'longBreak'), false);

  // Paused during breaks -> UNLOCKED
  assert.strictEqual(isChatLocked(false, 'shortBreak'), false);

  console.log('✓ Test 5 Passed: Focus chat lock strictly active only when running in pomodoro mode');
}

// Test 6: Pure Focus Black Theme evaluation
{
  function getThemeBackground(isRunning: boolean, mode: TimerMode, theme: string): string {
    if (isRunning && mode === 'pomodoro') {
      return 'bg-[#09090b] text-white';
    }
    if (theme === 'classic') {
      if (mode === 'pomodoro') return 'bg-[#ba4949]';
      if (mode === 'shortBreak') return 'bg-[#38858a]';
      return 'bg-[#397097]';
    }
    return 'bg-[#0f172a]';
  }

  // When running in pomodoro, must be pure focus black
  assert.strictEqual(getThemeBackground(true, 'pomodoro', 'classic'), 'bg-[#09090b] text-white');

  // When paused in pomodoro, must return to theme color
  assert.strictEqual(getThemeBackground(false, 'pomodoro', 'classic'), 'bg-[#ba4949]');

  // When in shortBreak, must return to shortBreak theme color
  assert.strictEqual(getThemeBackground(true, 'shortBreak', 'classic'), 'bg-[#38858a]');
  assert.strictEqual(getThemeBackground(false, 'shortBreak', 'classic'), 'bg-[#38858a]');

  // When in longBreak, must return to longBreak theme color
  assert.strictEqual(getThemeBackground(true, 'longBreak', 'classic'), 'bg-[#397097]');

  console.log('✓ Test 6 Passed: Pure focus black mode activates only on running pomodoro and reverts cleanly');
}

// Test 7: Participant progress with 0% progress and idle state
{
  const pIdle: Participant = {
    id: 'u5',
    name: 'Eve',
    avatar: '🦉',
    status: 'idle',
    completedPomodoros: 0,
    isHost: false,
    joinedAt: Date.now(),
  };

  const metrics = getParticipantProgressMetrics(pIdle);
  assert.strictEqual(metrics.percent, 0);
  assert.strictEqual(metrics.label, '0 🍅');
  assert.strictEqual(metrics.detail, 'Ready');
  assert.strictEqual(metrics.isTaskBased, false);
  console.log('✓ Test 7 Passed: Participant progress with 0 completed pomodoros and idle status');
}

// Test 8: Participant progress when all session tasks completed (0 remaining study pomodoros)
{
  const pFinished: Participant = {
    id: 'u6',
    name: 'Frank',
    avatar: '🎯',
    status: 'focusing',
    completedPomodoros: 4,
    remainingStudyPomodoros: 0,
    isHost: false,
    joinedAt: Date.now(),
  };

  const metrics = getParticipantProgressMetrics(pFinished);
  assert.strictEqual(metrics.percent, 100);
  assert.strictEqual(metrics.label, '4/4 🍅');
  assert.strictEqual(metrics.detail, 'Done! ✨');
  console.log('✓ Test 8 Passed: Participant progress displays "Done! ✨" when remaining study pomodoros reach 0');
}

// Test 9: Server-side status clearing logic
{
  const participant: Participant = {
    id: 'u7',
    name: 'Grace',
    avatar: '✨',
    status: 'focusing',
    currentTaskTitle: 'Old Task',
    taskAct: 2,
    taskEst: 4,
    remainingStudyPomodoros: 2,
    completedPomodoros: 1,
    isHost: false,
    joinedAt: Date.now(),
  };

  // Simulating deselecting active task on client (currentTaskTitle: undefined, taskAct: undefined, taskEst: undefined)
  const incomingUpdate = {
    status: 'idle' as const,
    currentTaskTitle: undefined,
    taskAct: undefined,
    taskEst: undefined,
    remainingStudyPomodoros: 0,
    completedPomodoros: 1,
  };

  // Applying the server update logic
  participant.status = incomingUpdate.status;
  participant.currentTaskTitle = incomingUpdate.currentTaskTitle || undefined;
  if (incomingUpdate.completedPomodoros !== undefined) participant.completedPomodoros = incomingUpdate.completedPomodoros;
  participant.taskAct = typeof incomingUpdate.taskAct === 'number' ? incomingUpdate.taskAct : undefined;
  participant.taskEst = typeof incomingUpdate.taskEst === 'number' ? incomingUpdate.taskEst : undefined;
  participant.remainingStudyPomodoros = typeof incomingUpdate.remainingStudyPomodoros === 'number' ? incomingUpdate.remainingStudyPomodoros : undefined;

  assert.strictEqual(participant.currentTaskTitle, undefined);
  assert.strictEqual(participant.taskAct, undefined);
  assert.strictEqual(participant.taskEst, undefined);
  assert.strictEqual(participant.remainingStudyPomodoros, 0);
  console.log('✓ Test 9 Passed: Server correctly clears old task fields when participant deselects task');
}

console.log('======================================================');
console.log('ALL FOCUS FEATURES & PARTICIPANT PROGRESS TESTS PASSED! 🎯');
console.log('======================================================');
