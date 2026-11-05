import React, { useState } from 'react';
import { X, User, Sparkles, Flame, Trophy, LogOut, Award } from 'lucide-react';
import { LocalUser } from '../utils/storage';
import { DiscordAuthUser } from '../types';
import { ProductivityHeatmap } from './ProductivityHeatmap';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser;
  discordUser?: DiscordAuthUser | null;
  heatmapData?: Record<string, { minutes: number; count: number }>;
  onSaveUser: (user: LocalUser) => void;
  onLogout?: () => void;
}

const AVATAR_OPTIONS = ['🍅', '⚡', '☕', '🚀', '🦊', '🦉', '🎯', '🌟', '💻', '💡', '🔥', '📚', '🎨', '🦁', '🐼'];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  discordUser,
  heatmapData = {},
  onSaveUser,
  onLogout,
}) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveUser({
      ...user,
      name: name.trim(),
      avatar,
    });
    onClose();
  };

  // XP progress calculation (250 XP per level)
  const currentXp = discordUser?.xp || 0;
  const currentLevel = discordUser?.level || 1;
  const xpInCurrentLevel = currentXp % 250;
  const xpPercent = Math.min(100, Math.round((xpInCurrentLevel / 250) * 100));

  // Compute total study minutes from heatmap
  const totalStudyMinutes = Object.values(heatmapData).reduce((sum, item) => sum + (item?.minutes || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-800 dark:text-slate-100 overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Profile & Stats</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Discord Identity & Level Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-indigo-500/10 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-md flex-shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl">
              {discordUser?.avatar ? (
                <img src={discordUser.avatar} alt="Discord Avatar" className="w-full h-full object-cover" />
              ) : (
                avatar
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {discordUser?.globalName || discordUser?.username || name}
                </h4>
                {discordUser && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#5865F2]/15 text-[#5865F2] font-semibold border border-[#5865F2]/30">
                    Discord Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {discordUser ? `@${discordUser.username}` : 'Local Profile'}
              </p>

              {/* Level & XP Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Award className="w-3.5 h-3.5" /> Level {currentLevel}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {xpInCurrentLevel} / 250 XP ({currentXp} total)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300 rounded-full"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {discordUser?.currentStreak || 0} Days
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Current Streak</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
              <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {discordUser?.highestStreak || 0} Days
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Best Streak</div>
            </div>

            <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center">
              <Sparkles className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {totalStudyMinutes} Min
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Annual Focus</div>
            </div>
          </div>

          {/* Productivity Heatmap */}
          <div>
            <ProductivityHeatmap
              data={heatmapData}
              totalMinutes={totalStudyMinutes}
              streak={discordUser?.currentStreak || 0}
            />
          </div>

          {/* Custom Avatar & Name Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Room Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                required
              />
            </div>

            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-2">Room Emoji Icon</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${
                      avatar === av
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-500 scale-105'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Save Room Identity</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/50 transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
