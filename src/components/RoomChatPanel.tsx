import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Lock, Unlock, Sparkles } from 'lucide-react';
import { ChatMessage } from '../types';
import { LocalUser } from '../utils/storage';

interface RoomChatPanelProps {
  messages: ChatMessage[];
  user: LocalUser;
  isChatLocked: boolean;
  isPureFocus?: boolean;
  onSendMessage: (text: string) => void;
}

export const RoomChatPanel: React.FC<RoomChatPanelProps> = ({
  messages,
  user,
  isChatLocked,
  isPureFocus = false,
  onSendMessage,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isChatLocked) return;
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  return (
    <aside
      className={`w-full flex flex-col rounded-3xl p-4 sm:p-5 border transition-all duration-500 shadow-xl ${
        isPureFocus
          ? 'bg-zinc-950/80 border-zinc-800/80 text-white backdrop-blur-md'
          : 'bg-black/20 backdrop-blur-md border-white/15 text-white'
      }`}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white leading-tight">Live Room Chat</h3>
            <p className="text-[11px] text-white/60">Study accountability & cheers</p>
          </div>
        </div>

        {/* Lock status badge */}
        <div>
          {isChatLocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Lock className="w-3 h-3 text-amber-300" />
              Focus Lock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Unlock className="w-3 h-3 text-emerald-300" />
              Chat Open
            </span>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-[320px] max-h-[380px] lg:max-h-[460px] pr-1 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/50">
            <Sparkles className="w-8 h-8 mb-2 text-white/30" />
            <p className="text-xs font-semibold">No messages yet</p>
            <p className="text-[11px] text-white/40 mt-0.5">
              Say hello or send a cheer to your study partners!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="text-center py-1.5 px-3 rounded-xl bg-white/10 border border-white/10 text-[11px] text-white/80 italic font-medium my-1"
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
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-xs">{msg.senderAvatar}</span>
                  <span className="text-[11px] font-bold text-white/80">
                    {msg.senderName}
                  </span>
                  {isMe && (
                    <span className="text-[10px] text-emerald-300 font-semibold">(You)</span>
                  )}
                </div>

                <div
                  className={`py-2 px-3.5 rounded-2xl max-w-[85%] text-xs break-words shadow-sm ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-xs font-medium'
                      : 'bg-white/15 text-white border border-white/10 rounded-bl-xs font-medium'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Focus Chat Lock Notice & Input Form */}
      <div className="mt-3.5 pt-3 border-t border-white/10">
        {isChatLocked ? (
          <div className="space-y-2.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Focus Mode Active</p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                  Chat is locked to eliminate distractions while focusing. It unlocks automatically when paused or during breaks!
                </p>
                <p className="text-[10px] text-amber-300/70 italic mt-1">
                  🔒 Foco ativo — chat bloqueado. Disponível nas pausas ou quando pausado.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
              <input
                type="text"
                disabled
                placeholder="Chat locked during focus..."
                className="flex-1 px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/40 cursor-not-allowed outline-none"
              />
              <button
                type="button"
                disabled
                className="w-9 h-9 rounded-xl bg-white/10 text-white/30 flex items-center justify-center cursor-not-allowed shrink-0"
              >
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col space-y-1.5">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a cheer or message..."
                className="flex-1 px-3.5 py-2.5 bg-white/15 border border-white/20 rounded-xl text-xs text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400 transition-all"
                maxLength={240}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-md"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-white/50 px-1">
              Press <kbd className="px-1 py-0.2 bg-white/15 rounded text-[9px] font-mono">Enter</kbd> to send
            </p>
          </form>
        )}
      </div>
    </aside>
  );
};
