import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, Check, Sparkles } from 'lucide-react';
import { TimerMode, Task, RoomState } from '../types';

interface TimerCardProps {
  mode: TimerMode;
  timeLeft: number;
  duration: number;
  isRunning: boolean;
  cycle: number;
  activeTask: Task | null;
  room: RoomState | null;
  isHost: boolean;
  themeColorKey: string;
  isPureFocus?: boolean;
  onSetMode: (mode: TimerMode) => void;
  onToggleTimer: () => void;
  onSkipTimer: () => void;
  onResetTimer: () => void;
  onToggleActiveTaskComplete?: () => void;
}

export const TimerCard: React.FC<TimerCardProps> = ({
  mode,
  timeLeft,
  duration,
  isRunning,
  cycle,
  activeTask,
  room,
  isHost,
  themeColorKey,
  isPureFocus = false,
  onSetMode,
  onToggleTimer,
  onSkipTimer,
  onResetTimer,
  onToggleActiveTaskComplete,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.max(0, Math.min(100, ((duration - timeLeft) / (duration || 1)) * 100));

  // Determine text color for the big start button
  const getButtonTextColor = () => {
    if (isPureFocus) return 'text-zinc-950';
    if (themeColorKey === 'cockpit') return 'text-slate-900';
    if (themeColorKey === 'forest') return 'text-emerald-800';
    if (themeColorKey === 'sunset') return 'text-indigo-900';
    if (mode === 'pomodoro') return 'text-[#ba4949]';
    if (mode === 'shortBreak') return 'text-[#38858a]';
    return 'text-[#397097]';
  };

  const isSyncedControlledByHost = Boolean(room && room.syncMode === 'synced' && !isHost);

  return (
    <div className="w-full max-w-lg mx-auto mt-4 sm:mt-8">
      {/* Top Progress Track */}
      <div className={`w-full ${isPureFocus ? 'bg-zinc-800' : 'bg-black/15'} h-1.5 rounded-full overflow-hidden mb-6 transition-colors duration-500`}>
        <div
          className="bg-white h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Glass Card */}
      <div
        className={`${
          isPureFocus
            ? 'bg-zinc-950/90 border-zinc-800/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10 backdrop-blur-md'
            : 'bg-white/10 backdrop-blur-sm border-white/10 shadow-xl'
        } rounded-3xl p-5 sm:p-8 xl:p-10 border text-center relative transition-all duration-500`}
      >
        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-8">
          <button
            onClick={() => onSetMode('pomodoro')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg font-semibold text-xs sm:text-base transition-all ${
              mode === 'pomodoro'
                ? isPureFocus
                  ? 'bg-white/15 text-white font-bold shadow-inner ring-1 ring-white/20'
                  : 'bg-black/20 text-white font-bold shadow-inner'
                : 'text-white/80 hover:text-white hover:bg-white/5'
            }`}
          >
            Pomodoro
          </button>
          <button
            onClick={() => onSetMode('shortBreak')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg font-semibold text-xs sm:text-base transition-all ${
              mode === 'shortBreak'
                ? 'bg-black/20 text-white font-bold shadow-inner'
                : 'text-white/80 hover:text-white hover:bg-white/5'
            }`}
          >
            Short Break
          </button>
          <button
            onClick={() => onSetMode('longBreak')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg font-semibold text-xs sm:text-base transition-all ${
              mode === 'longBreak'
                ? 'bg-black/20 text-white font-bold shadow-inner'
                : 'text-white/80 hover:text-white hover:bg-white/5'
            }`}
          >
            Long Break
          </button>
        </div>

        {/* Big Countdown Timer */}
        <div className="font-extrabold text-7xl sm:text-8xl xl:text-9xl tracking-tight select-none my-4 text-white drop-shadow-sm font-sans">
          {formatTime(timeLeft)}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-center space-x-3 sm:space-x-4">
          <button
            onClick={onToggleTimer}
            disabled={isSyncedControlledByHost}
            className={`group relative h-14 sm:h-16 px-8 sm:px-12 md:px-14 bg-white ${getButtonTextColor()} font-black text-xl sm:text-2xl rounded-xl transition-all ${
              isPureFocus ? 'shadow-[0_6px_0_#27272a]' : 'shadow-[0_6px_0_#e2e8f0]'
            } active:translate-y-[6px] active:shadow-none uppercase tracking-wider flex items-center justify-center select-none ${
              isSyncedControlledByHost ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'
            }`}
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <Pause className="w-5 h-5 fill-current" /> PAUSE
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-5 h-5 fill-current" /> START
              </span>
            )}
          </button>

          {/* Reset button */}
          <button
            onClick={onResetTimer}
            disabled={isSyncedControlledByHost}
            className={`w-12 h-12 rounded-xl ${
              isPureFocus
                ? 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                : 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white'
            } flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Reset timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Skip button */}
          <button
            onClick={onSkipTimer}
            disabled={isSyncedControlledByHost}
            className={`w-12 h-12 rounded-xl ${
              isPureFocus
                ? 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                : 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white'
            } flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
            title="Skip to next mode"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Synced banner if controlled by Host */}
        {isSyncedControlledByHost ? (
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs text-white/90">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Synced timer controlled by room host</span>
          </div>
        ) : (
          <p className="text-[11px] text-white/50 mt-4 hidden sm:block select-none">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/20 text-white/90 font-mono text-[10px]">Space</kbd> to {isRunning ? 'pause' : 'start'}
          </p>
        )}
      </div>

      {/* Cycle indicator & Motivational text */}
      <div className="text-center mt-6">
        <span className="text-white/70 font-medium text-base">#{cycle}</span>
        <h2 className="text-lg sm:text-xl font-medium text-white/95 mt-0.5">
          {mode === 'pomodoro' ? 'Time to focus!' : 'Time for a break!'}
        </h2>
      </div>

      {/* Active Task Banner */}
      {activeTask && (
        <div
          className={`mt-4 p-3.5 rounded-xl ${
            isPureFocus ? 'bg-zinc-950/80 border-zinc-800' : 'bg-black/15 border-white/10'
          } border flex items-center justify-between text-left shadow-sm transition-colors duration-500`}
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <button
              onClick={onToggleActiveTaskComplete}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                activeTask.completed
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'border-white/50 hover:border-white text-transparent'
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
            <div className="truncate">
              <p
                className={`font-semibold text-sm sm:text-base text-white truncate ${
                  activeTask.completed ? 'line-through text-white/50' : ''
                }`}
              >
                {activeTask.title}
              </p>
              {activeTask.notes && (
                <p className="text-xs text-white/60 truncate">{activeTask.notes}</p>
              )}
            </div>
          </div>
          <span className="text-xs font-bold text-white/80 bg-white/15 px-2.5 py-1 rounded-md shrink-0">
            {activeTask.act}/{activeTask.est}
          </span>
        </div>
      )}
    </div>
  );
};
