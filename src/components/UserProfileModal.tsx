import React, { useState } from 'react';
import { X, User, Sparkles } from 'lucide-react';
import { LocalUser } from '../utils/storage';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser;
  onSaveUser: (user: LocalUser) => void;
}

const AVATAR_OPTIONS = ['🍅', '⚡', '☕', '🚀', '🦊', '🦉', '🎯', '🌟', '💻', '💡', '🔥', '📚', '🎨', '🦁', '🐼'];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaveUser,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-popIn">
      <div className="bg-white rounded-3xl w-full max-w-sm flex flex-col shadow-2xl text-slate-800 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-lg text-slate-900">Your Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-4xl shadow-inner border border-slate-200 mb-2">
              {avatar}
            </div>
            <p className="text-xs text-slate-400 font-medium">Select your focus avatar</p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {AVATAR_OPTIONS.map((av) => (
              <button
                key={av}
                type="button"
                onClick={() => setAvatar(av)}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  avatar === av
                    ? 'bg-emerald-100 border-2 border-emerald-500 scale-110'
                    : 'bg-slate-100 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {av}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              required
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
