import React, { useState } from 'react';
import { Trophy, Flame, Zap, Shield, Sparkles } from 'lucide-react';
import { DiscordAuthUser } from '../types';

interface DiscordLoginGateProps {
  onLoginSuccess: (token: string, user: DiscordAuthUser) => void;
}

export const DiscordLoginGate: React.FC<DiscordLoginGateProps> = ({ onLoginSuccess }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscordOAuth = () => {
    setIsLoggingIn(true);
    window.location.href = '/api/auth/discord';
  };

  const handleDevMockLogin = async (presetName = 'FocusMaster') => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const mockDiscordId = `dev-${Date.now().toString(36)}`;
      const res = await fetch('/api/auth/mock-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: mockDiscordId,
          username: presetName.toLowerCase(),
          globalName: presetName,
          avatar: null,
        }),
      });

      if (!res.ok) {
        throw new Error('Dev login failed');
      }

      const data = await res.json();
      localStorage.setItem('pomotogether_token', data.token);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tomato Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-500 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/25 mb-5 text-4xl transform hover:scale-105 transition-transform duration-200">
          🍅
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          Welcome to Pomotogether
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Level up your focus with synchronized study rooms, daily streaks, XP progression, and community leaderboards.
        </p>

        {/* Features highlight pill list */}
        <div className="w-full space-y-2 mb-6">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left text-xs text-slate-700 dark:text-slate-300">
            <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Weekly, Monthly & Annual Global Leaderboards</span>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left text-xs text-slate-700 dark:text-slate-300">
            <Flame className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>Streak retention & automated XP leveling</span>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-left text-xs text-slate-700 dark:text-slate-300">
            <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span>Integrated Discord Bot (/stats, /leaderboard)</span>
          </div>
        </div>

        {error && (
          <div className="w-full mb-4 p-2.5 text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-500/30">
            {error}
          </div>
        )}

        {/* Discord OAuth Login Button */}
        <button
          onClick={handleDiscordOAuth}
          disabled={isLoggingIn}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-3 transition-all transform active:scale-98 disabled:opacity-50"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
          <span>{isLoggingIn ? 'Redirecting to Discord...' : 'Continue with Discord'}</span>
        </button>

        {/* Quick Dev Login for local tests */}
        <div className="w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 mb-2">Development / Instant Testing</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleDevMockLogin('DevFocus')}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
            >
              Demo User
            </button>
            <button
              onClick={() => handleDevMockLogin('AlicePro')}
              className="flex-1 py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition"
            >
              Alice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
