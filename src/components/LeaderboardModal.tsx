import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Zap, X, Calendar, Clock, RefreshCw } from 'lucide-react';
import { LeaderboardUser, LeaderboardTimeframe, DiscordAuthUser } from '../types';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DiscordAuthUser | null;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('weekly');
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async (tf: LeaderboardTimeframe) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?timeframe=${tf}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard data');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err: any) {
      setError(err.message || 'Error loading leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard(timeframe);
    }
  }, [isOpen, timeframe]);

  if (!isOpen) return null;

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const userRankEntry = currentUser ? leaderboard.find((u) => u.discordId === currentUser.discordId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Study Leaderboard</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track top focusers across the Pomotogether community
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLeaderboard(timeframe)}
              disabled={isLoading}
              title="Refresh Leaderboard"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeframe Selector Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          {(
            [
              { id: 'weekly', label: 'Weekly', desc: 'Resets Sun 00:00 UTC' },
              { id: 'monthly', label: 'Monthly', desc: 'Current Month' },
              { id: 'yearly', label: 'Current Year', desc: 'Annual 2026' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition border flex flex-col items-center justify-center ${
                timeframe === tab.id
                  ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] font-normal opacity-75">{tab.desc}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Calculating rankings...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-sm">
              <div className="inline-block p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 mb-2">
                {error}
              </div>
              <div>
                <button
                  onClick={() => fetchLeaderboard(timeframe)}
                  className="mt-2 px-4 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-lg text-xs font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No sessions recorded yet for this timeframe.</p>
              <p className="text-xs mt-1">Start a pomodoro timer now to take the #1 spot!</p>
            </div>
          ) : (
            <>
              {/* Podium for Top 3 */}
              <div className="grid grid-cols-3 gap-3 items-end pt-4 pb-2">
                {/* 2nd Place */}
                {top3[1] ? (
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl relative order-1">
                    <span className="text-xl mb-1">🥈</span>
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-slate-300 dark:border-slate-600 mb-2">
                      {top3[1].avatar ? (
                        <img src={top3[1].avatar} alt={top3[1].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-lg">
                          🍅
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-full text-center">
                      {top3[1].globalName || top3[1].username}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                      {top3[1].totalMinutes}m ({(top3[1].totalMinutes / 60).toFixed(1)}h)
                    </span>
                    <span className="text-[10px] text-slate-400">Lvl {top3[1].level}</span>
                  </div>
                ) : (
                  <div className="order-1" />
                )}

                {/* 1st Place (Center, elevated) */}
                {top3[0] ? (
                  <div className="flex flex-col items-center bg-gradient-to-b from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent border-2 border-amber-400 dark:border-amber-500/40 p-4 rounded-2xl relative order-2 -mt-4 shadow-md">
                    <span className="text-3xl mb-1">🥇</span>
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-md mb-2">
                      {top3[0].avatar ? (
                        <img src={top3[0].avatar} alt={top3[0].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-200 dark:bg-amber-900 text-xl">
                          🍅
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate max-w-full text-center">
                      {top3[0].globalName || top3[0].username}
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {top3[0].totalMinutes}m ({(top3[0].totalMinutes / 60).toFixed(1)}h)
                    </span>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Lvl {top3[0].level}</span>
                      <span>•</span>
                      <span className="text-amber-500 font-semibold">🔥 {top3[0].currentStreak}d</span>
                    </div>
                  </div>
                ) : (
                  <div className="order-2" />
                )}

                {/* 3rd Place */}
                {top3[2] ? (
                  <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl relative order-3">
                    <span className="text-xl mb-1">🥉</span>
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-700/40 dark:border-amber-700/60 mb-2">
                      {top3[2].avatar ? (
                        <img src={top3[2].avatar} alt={top3[2].username} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-lg">
                          🍅
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-full text-center">
                      {top3[2].globalName || top3[2].username}
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                      {top3[2].totalMinutes}m ({(top3[2].totalMinutes / 60).toFixed(1)}h)
                    </span>
                    <span className="text-[10px] text-slate-400">Lvl {top3[2].level}</span>
                  </div>
                ) : (
                  <div className="order-3" />
                )}
              </div>

              {/* Full Ranked List */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                  Full Rankings
                </div>
                {leaderboard.map((user) => {
                  const isCurrent = currentUser?.discordId === user.discordId;
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 text-center text-xs font-bold ${
                            user.rank === 1
                              ? 'text-amber-500'
                              : user.rank === 2
                              ? 'text-slate-400'
                              : user.rank === 3
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          #{user.rank}
                        </span>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-slate-700">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">🍅</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {user.globalName || user.username}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-500 rounded font-semibold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Level {user.level}</span>
                            <span>•</span>
                            <span>{user.xp} XP</span>
                            {user.currentStreak > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-amber-500 font-medium flex items-center gap-0.5">
                                  🔥 {user.currentStreak}d
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {user.totalMinutes} min
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {(user.totalMinutes / 60).toFixed(1)} hrs • {user.sessionsCount} sessions
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Current user sticky rank footer if logged in */}
        {currentUser && (
          <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-500/30 flex items-center justify-between text-xs">
            {userRankEntry ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-700 dark:text-amber-400">Your Rank: #{userRankEntry.rank}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {userRankEntry.totalMinutes} minutes focused this period
                  </span>
                </div>
                <div className="font-semibold text-amber-700 dark:text-amber-400">
                  🔥 {userRankEntry.currentStreak} Day Streak
                </div>
              </>
            ) : (
              <div className="w-full text-center text-slate-500 dark:text-slate-400">
                You haven't recorded focus sessions in this period yet. Complete a pomodoro to join the leaderboard!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
