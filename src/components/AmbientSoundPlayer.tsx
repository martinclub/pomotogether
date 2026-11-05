import React, { useState } from 'react';
import { Volume2, VolumeX, CloudRain, Coffee, Flame, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { ambientAudio } from '../utils/ambientAudio';

interface TrackState {
  id: 'rain' | 'coffee' | 'fireplace' | 'lofi';
  label: string;
  icon: React.ReactNode;
  isPlaying: boolean;
  volume: number; // 0 to 1
}

export const AmbientSoundPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [tracks, setTracks] = useState<TrackState[]>([
    {
      id: 'rain',
      label: 'Rainfall',
      icon: <CloudRain className="w-4 h-4 text-sky-500" />,
      isPlaying: false,
      volume: 0.5,
    },
    {
      id: 'coffee',
      label: 'Coffee Shop',
      icon: <Coffee className="w-4 h-4 text-amber-600" />,
      isPlaying: false,
      volume: 0.5,
    },
    {
      id: 'fireplace',
      label: 'Fireplace',
      icon: <Flame className="w-4 h-4 text-orange-500" />,
      isPlaying: false,
      volume: 0.5,
    },
    {
      id: 'lofi',
      label: 'Lofi Chords',
      icon: <Music className="w-4 h-4 text-indigo-500" />,
      isPlaying: false,
      volume: 0.5,
    },
  ]);

  const activeCount = tracks.filter((t) => t.isPlaying).length;

  const toggleTrack = (id: 'rain' | 'coffee' | 'fireplace' | 'lofi') => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextPlaying = !t.isPlaying;
          ambientAudio.toggleTrack(id, nextPlaying);
          return { ...t, isPlaying: nextPlaying };
        }
        return t;
      })
    );
  };

  const updateVolume = (id: 'rain' | 'coffee' | 'fireplace' | 'lofi', vol: number) => {
    ambientAudio.setVolume(id, vol);
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, volume: vol } : t))
    );
  };

  const stopAll = () => {
    ambientAudio.stopAll();
    setTracks((prev) => prev.map((t) => ({ ...t, isPlaying: false })));
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition shadow-sm border ${
          activeCount > 0
            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
            : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
        }`}
        title="Ambient Sounds & Lofi"
      >
        {activeCount > 0 ? (
          <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 opacity-60" />
        )}
        <span>Ambient {activeCount > 0 ? `(${activeCount})` : ''}</span>
        {isOpen ? <ChevronUp className="w-3 h-3 opacity-60" /> : <ChevronDown className="w-3 h-3 opacity-60" />}
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 space-y-3 animate-fade-in text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                🎧 Ambient Synthesizer
              </span>
              {activeCount > 0 && (
                <button
                  onClick={stopAll}
                  className="text-[10px] text-rose-500 hover:text-rose-600 dark:text-rose-400 font-medium transition"
                >
                  Mute All
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={`p-2 rounded-xl border transition ${
                    track.isPlaying
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                      : 'bg-transparent border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      onClick={() => toggleTrack(track.id)}
                      className="flex items-center gap-2 text-xs font-semibold hover:opacity-80 transition text-left"
                    >
                      <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                        {track.icon}
                      </div>
                      <span>{track.label}</span>
                    </button>
                    <button
                      onClick={() => toggleTrack(track.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                        track.isPlaying
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {track.isPlaying ? 'Active' : 'Off'}
                    </button>
                  </div>

                  {/* Volume Slider */}
                  {track.isPlaying && (
                    <div className="flex items-center gap-2 pl-7 pt-1 animate-fade-in">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={track.volume}
                        onChange={(e) => updateVolume(track.id, parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 w-6 text-right">
                        {Math.round(track.volume * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1 border-t border-slate-100 dark:border-slate-800">
              Synthesized in real-time via Web Audio API
            </div>
          </div>
        </>
      )}
    </div>
  );
};
