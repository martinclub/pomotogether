import React from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantProgressProps {
  participant: Participant;
  isCurrentUser: boolean;
  compact?: boolean;
}

export function getParticipantProgressMetrics(p: Participant) {
  if (p.taskEst && p.taskEst > 0) {
    const act = p.taskAct ?? 0;
    const est = p.taskEst;
    const percent = Math.min(100, Math.round((act / est) * 100));
    return {
      percent,
      label: `${act}/${est} 🍅`,
      detail: `${percent}%`,
      isTaskBased: true,
    };
  }

  if (
    typeof p.remainingStudyPomodoros === 'number' &&
    (p.completedPomodoros + p.remainingStudyPomodoros) > 0
  ) {
    const completed = p.completedPomodoros || 0;
    const total = completed + p.remainingStudyPomodoros;
    const percent = Math.min(100, Math.round((completed / total) * 100));
    return {
      percent,
      label: `${completed}/${total} 🍅`,
      detail: p.remainingStudyPomodoros === 0 ? 'Done! ✨' : `${percent}% (${p.remainingStudyPomodoros} left)`,
      isTaskBased: false,
    };
  }

  const completed = p.completedPomodoros || 0;
  if (completed > 0) {
    const target = Math.max(4, Math.ceil(completed / 4) * 4);
    const percent = Math.min(100, Math.round((completed / target) * 100));
    return {
      percent,
      label: `${completed}/${target} 🍅`,
      detail: `${percent}%`,
      isTaskBased: false,
    };
  }

  return {
    percent: p.status === 'focusing' ? 15 : 0,
    label: `${completed} 🍅`,
    detail: p.status === 'focusing' ? 'Focusing' : 'Ready',
    isTaskBased: false,
  };
}

export const ParticipantProgress: React.FC<ParticipantProgressProps> = ({
  participant: p,
  isCurrentUser,
  compact = false,
}) => {
  const isFocusing = p.status === 'focusing';
  const isBreak = p.status === 'shortBreak' || p.status === 'longBreak';
  const metrics = getParticipantProgressMetrics(p);

  const getBarColor = () => {
    if (metrics.percent >= 100) return 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
    if (isFocusing) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (isBreak) return 'bg-gradient-to-r from-blue-400 to-sky-300';
    return 'bg-slate-400/80';
  };

  const getStatusBadge = () => {
    if (isFocusing) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Focusing
        </span>
      );
    }
    if (isBreak) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded-full border border-sky-500/30">
          ☕ Break
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-medium text-white/50 bg-white/10 px-1.5 py-0.5 rounded-full">
        💤 Idle
      </span>
    );
  };

  return (
    <div
      className={`p-3 rounded-2xl transition-all border ${
        isCurrentUser
          ? 'bg-white/15 border-white/25 shadow-md'
          : 'bg-white/10 hover:bg-white/15 border-white/10'
      }`}
    >
      {/* Top Row: Avatar + Name + Status */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="relative shrink-0">
            <span className="text-xl select-none">{p.avatar}</span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black/40 ${
                isFocusing
                  ? 'bg-emerald-400 animate-pulse'
                  : isBreak
                  ? 'bg-sky-400'
                  : 'bg-slate-400'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5 font-bold text-white text-xs truncate">
              <span className="truncate">{p.name}</span>
              {p.isHost && (
                <span title="Room Host" className="shrink-0 flex items-center">
                  <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                </span>
              )}
              {isCurrentUser && (
                <span className="text-[10px] text-emerald-300 font-semibold shrink-0">
                  (You)
                </span>
              )}
            </div>
            {p.currentTaskTitle ? (
              <div
                className="text-[11px] text-white/80 truncate font-medium max-w-[150px] sm:max-w-[180px]"
                title={p.currentTaskTitle}
              >
                🎯 {p.currentTaskTitle}
              </div>
            ) : (
              <div className="text-[11px] text-white/50 italic">No task set</div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          {getStatusBadge()}
        </div>
      </div>

      {/* Progress Bar Section */}
      <div className="mt-2 pt-1.5 border-t border-white/10">
        <div className="flex items-center justify-between text-[11px] text-white/80 font-medium mb-1">
          <span className="text-white/70 flex items-center gap-1">
            {metrics.isTaskBased ? 'Task Progress' : 'Study Progress'}
            {metrics.percent >= 100 && (
              <Sparkles className="w-3 h-3 text-amber-300 inline" />
            )}
          </span>
          <span className="font-bold text-white tracking-wide">
            {metrics.label} • {metrics.detail}
          </span>
        </div>

        {/* The Animated Progress Track */}
        <div className="w-full bg-black/30 dark:bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor()}`}
            style={{ width: metrics.percent > 0 ? `${Math.max(4, metrics.percent)}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  );
};
