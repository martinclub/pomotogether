import React, { useState } from 'react';
import { Users, Copy, Check, LogOut, Radio, Crown, Sparkles, Smile } from 'lucide-react';
import { RoomState, RoomSyncMode } from '../types';
import { LocalUser } from '../utils/storage';
import { ParticipantProgress } from './ParticipantProgress';

interface RoomMembersPanelProps {
  room: RoomState;
  user: LocalUser;
  isHost: boolean;
  isPureFocus?: boolean;
  onToggleSyncMode: (syncMode: RoomSyncMode) => void;
  onSendReaction: (emoji: string) => void;
  onLeaveRoom: () => void;
}

export const RoomMembersPanel: React.FC<RoomMembersPanelProps> = ({
  room,
  user,
  isHost,
  isPureFocus = false,
  onToggleSyncMode,
  onSendReaction,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const REACTION_EMOJIS = ['👏', '🔥', '☕', '🎉', '🍅', '🚀', '💪', '❤️'];

  return (
    <aside
      className={`w-full flex flex-col rounded-3xl p-4 sm:p-5 border transition-all duration-500 shadow-xl ${
        isPureFocus
          ? 'bg-zinc-950/80 border-zinc-800/80 text-white backdrop-blur-md'
          : 'bg-black/20 backdrop-blur-md border-white/15 text-white'
      }`}
    >
      {/* Room Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10">
        <div className="min-w-0 pr-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-base text-white truncate leading-tight">
              {room.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-white/15 text-[11px] font-mono font-bold tracking-wider text-white">
              #{room.code}
            </span>
            <span className="text-[11px] text-white/70">
              {room.participants.length} online
            </span>
          </div>
        </div>

        {/* Copy Invite Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-semibold text-white transition-all shrink-0 border border-white/10"
          title="Copy invite link to clipboard"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{copied ? 'Copied!' : 'Invite'}</span>
        </button>
      </div>

      {/* Sync Mode Banner */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/10 border border-white/10 mb-4 text-xs">
        <div className="flex items-center space-x-2 min-w-0">
          <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">
              {room.syncMode === 'synced' ? 'Synchronized Timer' : 'Independent Timers'}
            </p>
            <p className="text-[10px] text-white/60 truncate">
              {room.syncMode === 'synced' ? 'Host leads study cycles' : 'Individual pacing'}
            </p>
          </div>
        </div>

        {isHost && (
          <button
            onClick={() =>
              onToggleSyncMode(room.syncMode === 'synced' ? 'independent' : 'synced')
            }
            className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[10px] font-bold text-white transition-all shrink-0 ml-2"
          >
            Switch
          </button>
        )}
      </div>

      {/* Participants Header */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-emerald-300" />
          Study Members ({room.participants.length})
        </span>
      </div>

      {/* Participants List with Individual Progress Bars */}
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] lg:max-h-[460px] pr-1 scrollbar-thin">
        {room.participants.map((participant) => (
          <ParticipantProgress
            key={participant.id}
            participant={participant}
            isCurrentUser={participant.id === user.id}
          />
        ))}
      </div>

      {/* Cheers & High-Fives Dock */}
      <div className="mt-4 pt-3.5 border-t border-white/10">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/70 flex items-center gap-1">
            <Smile className="w-3 h-3 text-amber-300" />
            Send Cheer
          </span>
          <span className="text-[10px] text-white/50">High five peers</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 lg:grid-cols-4">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-lg flex items-center justify-center transition-all hover:scale-105 border border-white/10"
              title={`Send ${emoji} to room`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Room Footer */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={onLeaveRoom}
          className="flex items-center space-x-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-colors py-1 px-2 rounded-lg hover:bg-rose-500/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>

        <span className="text-[10px] text-white/40">Pomotogether v2.0</span>
      </div>
    </aside>
  );
};
