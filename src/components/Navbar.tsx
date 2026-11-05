import React from 'react';
import { BarChart3, Settings, Users, Trophy } from 'lucide-react';
import { LocalUser } from '../utils/storage';
import { RoomState, DiscordAuthUser } from '../types';
import { AmbientSoundPlayer } from './AmbientSoundPlayer';

interface NavbarProps {
  user: LocalUser;
  discordUser?: DiscordAuthUser | null;
  room: RoomState | null;
  isPureFocus?: boolean;
  onOpenReport: () => void;
  onOpenSettings: () => void;
  onOpenRooms: () => void;
  onOpenLeaderboard: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  discordUser,
  room,
  isPureFocus = false,
  onOpenReport,
  onOpenSettings,
  onOpenRooms,
  onOpenLeaderboard,
  onOpenProfile,
}) => {
  return (
    <header className={`w-full ${room ? 'max-w-7xl' : 'max-w-3xl'} mx-auto flex items-center justify-between py-4 px-4 sm:px-6 border-b ${isPureFocus ? 'border-zinc-800' : 'border-white/10'} transition-all duration-500`}>
      {/* Brand */}
      <div className="flex items-center space-x-2.5 cursor-pointer select-none">
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            <circle cx="50" cy="55" r="42" fill="#fff" />
            <path d="M50 15 C45 30, 48 35, 50 40 C52 35, 55 30, 50 15" fill="#4caf50" />
            <circle cx="48" cy="22" r="4" fill="#388e3c" />
          </svg>
        </div>
        <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
          Pomotogether
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-white/20 rounded-md text-white/90">
            Online
          </span>
        </span>
      </div>

      {/* Nav Actions */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 text-sm font-medium">
        {/* Ambient Sound / Lofi Player */}
        <AmbientSoundPlayer />

        {/* Leaderboard Button */}
        <button
          onClick={onOpenLeaderboard}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-all text-xs sm:text-sm font-medium"
          title="Global Focus Leaderboard"
        >
          <Trophy className="w-4 h-4 text-amber-300" />
          <span className="hidden sm:inline">Leaderboard</span>
        </button>

        {/* Rooms / Online status button */}
        <button
          onClick={onOpenRooms}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all text-xs sm:text-sm font-medium ${
            room
              ? 'bg-emerald-500/80 hover:bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-300/40'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={room ? `Room ${room.code} (${room.participants.length} online)` : 'Join or Create Room'}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">
            {room ? `Room: ${room.code}` : 'Rooms'}
          </span>
          {room && (
            <span className="px-1.5 py-0.2 bg-white/30 rounded-full text-[11px] font-bold">
              {room.participants.length}
            </span>
          )}
        </button>

        {/* Report / Analytics Button */}
        <button
          onClick={onOpenReport}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-all text-xs sm:text-sm"
          title="View Report & Stats"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden md:inline">Report</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-all text-xs sm:text-sm"
          title="Timer & App Settings"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden md:inline">Settings</span>
        </button>

        {/* User Profile Avatar Pill */}
        <button
          onClick={onOpenProfile}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-all text-xs sm:text-sm border border-white/10"
          title="Click to view profile & stats"
        >
          {discordUser?.avatar ? (
            <img src={discordUser.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <span className="text-base leading-none">{user.avatar}</span>
          )}
          <span className="hidden lg:inline max-w-[85px] truncate">
            {discordUser?.globalName || discordUser?.username || user.name.split('#')[0]}
          </span>
          {discordUser && (
            <span className="text-[10px] px-1 py-0.2 bg-amber-400 text-slate-900 rounded font-black">
              L{discordUser.level}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
