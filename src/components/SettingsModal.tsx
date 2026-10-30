import React from 'react';
import { X, Volume2, Bell, Clock, Palette, Play } from 'lucide-react';
import { UserSettings, AlarmSound, TickingSound, ColorTheme } from '../types';
import { playAlarm } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    onSaveSettings({ ...settings, [key]: value });
  };

  const requestNotification = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      if (res === 'granted') {
        new Notification('Pomotogether', {
          body: 'Desktop notifications are enabled!',
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="55" r="42" fill="%23ba4949"/></svg>',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-popIn">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-lg text-slate-900">Timer Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Time (minutes) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Time (Minutes)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pomodoro</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.pomodoroTime}
                  onChange={(e) => handleChange('pomodoroTime', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-center text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Short Break</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.shortBreakTime}
                  onChange={(e) => handleChange('shortBreakTime', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-center text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Long Break</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={settings.longBreakTime}
                  onChange={(e) => handleChange('longBreakTime', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-center text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Automation Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Auto-start Breaks</p>
                <p className="text-xs text-slate-500">Automatically begin short/long breaks</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartBreaks}
                onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Auto-start Pomodoros</p>
                <p className="text-xs text-slate-500">Automatically begin next pomodoro when break finishes</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoStartPomodoros}
                onChange={(e) => handleChange('autoStartPomodoros', e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-sm font-semibold text-slate-800">Long Break interval</p>
                <p className="text-xs text-slate-500">Number of pomodoros before long break</p>
              </div>
              <input
                type="number"
                min={1}
                max={12}
                value={settings.longBreakInterval}
                onChange={(e) => handleChange('longBreakInterval', Math.max(1, parseInt(e.target.value) || 4))}
                className="w-16 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg font-bold text-center text-slate-900"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Sounds */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Sound & Alarms
            </h4>

            {/* Alarm Sound */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Alarm Sound</label>
                <select
                  value={settings.alarmSound}
                  onChange={(e) => handleChange('alarmSound', e.target.value as AlarmSound)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="bell">Kitchen Bell</option>
                  <option value="digital">Digital Alarm</option>
                  <option value="gong">Zen Gong</option>
                  <option value="chime">Ascending Chime</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => playAlarm(settings.alarmSound, settings.alarmVolume)}
                className="mt-5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                title="Preview alarm sound"
              >
                <Play className="w-3 h-3 fill-current" /> Test
              </button>
            </div>

            {/* Volume slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Alarm Volume</span>
                <span>{settings.alarmVolume}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.alarmVolume}
                onChange={(e) => handleChange('alarmVolume', parseInt(e.target.value) || 0)}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {/* Ticking sound */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ticking Sound</label>
              <select
                value={settings.tickingSound}
                onChange={(e) => handleChange('tickingSound', e.target.value as TickingSound)}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                <option value="none">None</option>
                <option value="slow">Ticking Slow (Clock)</option>
                <option value="fast">Ticking Fast</option>
              </select>
            </div>

            {/* Button click sound */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Button Click Sound</p>
                <p className="text-xs text-slate-500">Play subtle click feedback on buttons</p>
              </div>
              <input
                type="checkbox"
                checked={settings.clickSound}
                onChange={(e) => handleChange('clickSound', e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Theme */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" /> Color Theme
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'classic', label: 'Classic Pomofocus', colors: ['#ba4949', '#38858a', '#397097'] },
                { id: 'cockpit', label: 'Dark Cockpit', colors: ['#0f172a', '#1e293b', '#334155'] },
                { id: 'forest', label: 'Zen Forest', colors: ['#2e7d32', '#388e3c', '#4caf50'] },
                { id: 'sunset', label: 'Sunset Chill', colors: ['#6b21a8', '#7c3aed', '#8b5cf6'] },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleChange('colorTheme', theme.id as ColorTheme)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                    settings.colorTheme === theme.id
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800">{theme.label}</span>
                  <div className="flex -space-x-1">
                    {theme.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-3.5 h-3.5 rounded-full border border-white"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Browser Notifications */}
          <div>
            <button
              onClick={requestNotification}
              className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-all"
            >
              <Bell className="w-4 h-4 text-emerald-600" />
              <span>Enable Browser Desktop Notifications</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
