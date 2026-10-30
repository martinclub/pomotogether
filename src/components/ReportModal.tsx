import React from 'react';
import { X, BarChart3, Clock, Flame, Calendar, Download } from 'lucide-react';
import { UserStats, Task } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  tasks: Task[];
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  stats,
  tasks,
}) => {
  if (!isOpen) return null;

  // Build last 7 days chart data
  const days: { label: string; date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({
      label: dayLabel,
      date: dateStr,
      minutes: stats.history[dateStr] || 0,
    });
  }

  const maxMinutes = Math.max(60, ...days.map((d) => d.minutes));

  const hoursFocused = (stats.totalFocusMinutes / 60).toFixed(1);

  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Focus Minutes'],
      ...Object.entries(stats.history).map(([dt, mins]) => [dt, mins.toString()]),
      [],
      ['Task Title', 'Actual Pomodoros', 'Estimated Pomodoros', 'Completed'],
      ...tasks.map((t) => [t.title, t.act.toString(), t.est.toString(), t.completed ? 'Yes' : 'No']),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pomotogether-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-popIn">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-lg text-slate-900">Activity Report</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary metrics 4-box grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hours</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{hoursFocused}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 mb-1">
                <span>🍅</span>
                <span>Pomodoros</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.pomodorosCompleted}</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 mb-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Streak</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.currentStreak}d</p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Days</span>
              </div>
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                {Object.keys(stats.history).length || 1}
              </p>
            </div>
          </div>

          {/* Activity Bar Chart */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Focus Time (Past 7 Days)
            </h4>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-end justify-between h-36 pt-4 px-2">
                {days.map((day) => {
                  const heightPercent = Math.max(6, (day.minutes / maxMinutes) * 100);
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group">
                      <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {day.minutes}m
                      </div>
                      <div className="w-6 sm:w-8 bg-slate-200 rounded-t-lg h-full flex items-end">
                        <div
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isToday ? 'bg-emerald-500' : 'bg-slate-400 group-hover:bg-emerald-400'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-semibold mt-2 ${isToday ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tasks summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Recent Tasks ({tasks.length})
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tasks recorded yet.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <span className={`font-semibold truncate pr-2 ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {task.title}
                    </span>
                    <span className="font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      {task.act} / {task.est} 🍅
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
