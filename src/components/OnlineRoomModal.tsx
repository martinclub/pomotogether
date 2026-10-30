import React, { useState, useEffect, useRef } from 'react';
import { X, Users, Copy, Check, LogOut, Send, Crown, Sparkles, Radio, Share2 } from 'lucide-react';
import { RoomState, RoomSyncMode } from '../types';
import { LocalUser } from '../utils/storage';

interface OnlineRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser;
  room: RoomState | null;
  onJoinRoom: (code: string) => void;
  onCreateRoom: (name: string, syncMode: RoomSyncMode) => void;
  onLeaveRoom: () => void;
  onToggleSyncMode: (syncMode: RoomSyncMode) => void;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

export const OnlineRoomModal: React.FC<OnlineRoomModalProps> = ({
  isOpen,
  onClose,
  user,
  room,
  onJoinRoom,
  onCreateRoom,
  onLeaveRoom,
  onToggleSyncMode,
  onSendMessage,
  onSendReaction,
}) => {
  const [tab, setTab] = useState<'join' | 'create'>('join');
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createSyncMode, setCreateSyncMode] = useState<RoomSyncMode>('synced');
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (room?.messages.length) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.messages.length]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}?room=${room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput);
    setChatInput('');
  };

  const REACTION_EMOJIS = ['👏', '🔥', '☕', '🎉', '🍅', '🚀', '💪', '❤️'];

  const isHost = room?.hostId === user.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-popIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 leading-tight">
                {room ? room.name : 'Study & Focus Rooms'}
              </h3>
              <p className="text-xs text-slate-500">
                {room
                  ? `Room Code: ${room.code} • ${room.participants.length} online`
                  : 'Pomotogether Online Multiplayer'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {room && (
              <button
                onClick={handleCopyLink}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                title="Copy share link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link!' : 'Invite'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {!room ? (
          /* Join or Create View */
          <div className="p-6 overflow-y-auto">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
              <button
                onClick={() => setTab('join')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  tab === 'join' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Join with Code
              </button>
              <button
                onClick={() => setTab('create')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  tab === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create New Room
              </button>
            </div>

            {tab === 'join' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Room Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FOCUS-42"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-lg font-bold tracking-wider uppercase text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    maxLength={12}
                    autoFocus
                  />
                </div>

                <button
                  onClick={() => joinCode.trim() && onJoinRoom(joinCode)}
                  disabled={!joinCode.trim()}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Join Room</span>
                </button>

                {/* Quick Join Public Hubs */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Or Quick Join Hub:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['LOBBY', 'STUDY-HUB', 'DEV-SPRINT', 'ZEN-ZONE'].map((code) => (
                      <button
                        key={code}
                        onClick={() => onJoinRoom(code)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold transition-all border border-slate-200"
                      >
                        #{code}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Night Owls Study Club"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    maxLength={40}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Timer Sync Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreateSyncMode('synced')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        createSyncMode === 'synced'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-sm text-slate-900">
                        <Radio className="w-4 h-4 text-emerald-600" />
                        <span>Synchronized</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Host controls start/pause. Everyone focuses and takes breaks in sync!
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateSyncMode('independent')}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        createSyncMode === 'independent'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 font-bold text-sm text-slate-900">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>Independent</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Everyone controls their own timer while sharing live vibes, tasks & cheers.
                      </p>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => onCreateRoom(createName, createSyncMode)}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Room & Start</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Active Room View */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[420px]">
            {/* Left: Participants & Cheer */}
            <div className="w-full md:w-1/2 p-4 sm:p-5 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between overflow-y-auto">
              <div>
                {/* Sync Mode Banner */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Sync Mode
                    </span>
                    <p className="text-xs font-semibold text-slate-800">
                      {room.syncMode === 'synced' ? '⏱ Host-Synchronized Timer' : '👥 Independent Timers'}
                    </p>
                  </div>
                  {isHost && (
                    <button
                      onClick={() =>
                        onToggleSyncMode(room.syncMode === 'synced' ? 'independent' : 'synced')
                      }
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm"
                    >
                      Switch
                    </button>
                  )}
                </div>

                {/* Participants Header */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Members ({room.participants.length})
                  </span>
                </div>

                {/* Participants List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {room.participants.map((p) => {
                    const isFocusing = p.status === 'focusing';
                    const isBreak = p.status === 'shortBreak' || p.status === 'longBreak';
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-100 transition-all"
                      >
                        <div className="flex items-center space-x-2.5 overflow-hidden">
                          <div className="relative">
                            <span className="text-xl">{p.avatar}</span>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                isFocusing
                                  ? 'bg-emerald-500 animate-pulse'
                                  : isBreak
                                  ? 'bg-blue-500'
                                  : 'bg-slate-400'
                              }`}
                            />
                          </div>

                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {p.name}
                              </span>
                              {p.isHost && (
                                <Crown className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                              {p.id === user.id && (
                                <span className="text-[10px] text-slate-400 font-semibold">(You)</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 truncate mt-0.5">
                              {p.currentTaskTitle ? (
                                <>
                                  <span className="truncate font-medium text-slate-700">
                                    🎯 {p.currentTaskTitle}
                                  </span>
                                  {p.taskEst ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                                      {p.taskAct ?? 0}/{p.taskEst} 🍅
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-slate-400 italic">No active task selected</span>
                              )}
                            </div>
                            {typeof p.remainingStudyPomodoros === 'number' && p.remainingStudyPomodoros > 0 && (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                ⏳ {p.remainingStudyPomodoros} pomodoro{p.remainingStudyPomodoros > 1 ? 's' : ''} left in study
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 pl-2">
                          <div
                            className="flex items-center space-x-1 text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm"
                            title="Completed Pomodoros"
                          >
                            <span>🍅</span>
                            <span>{p.completedPomodoros || 0}</span>
                          </div>
                          {typeof p.remainingStudyPomodoros === 'number' && (
                            <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                              {p.remainingStudyPomodoros === 0 ? '✨ Study Done' : `${p.remainingStudyPomodoros} left`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cheer / Send Reaction Dock */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Send Cheer & High Five
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onSendReaction(emoji)}
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-emerald-100 text-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between">
                  <button
                    onClick={onLeaveRoom}
                    className="flex items-center space-x-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Leave Room</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Live Room Chat */}
            <div className="w-full md:w-1/2 flex flex-col justify-between bg-slate-50/40 p-4 sm:p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Room Chat
              </span>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-2.5 max-h-64 sm:max-h-72 pr-1 mb-3 text-xs">
                {room.messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div
                        key={msg.id}
                        className="text-center py-1 px-2 rounded-lg bg-slate-100/70 text-[11px] text-slate-500 italic"
                      >
                        {msg.text}
                      </div>
                    );
                  }

                  const isMe = msg.senderId === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1 mb-0.5">
                        <span className="text-xs">{msg.senderAvatar}</span>
                        <span className="text-[10px] font-bold text-slate-500">{msg.senderName}</span>
                      </div>
                      <div
                        className={`py-1.5 px-3 rounded-2xl max-w-[85%] break-words ${
                          isMe
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a cheer or message..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  maxLength={200}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="w-8 h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
