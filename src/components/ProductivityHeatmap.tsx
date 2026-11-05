import React, { useState } from 'react';

interface ProductivityHeatmapProps {
  data: Record<string, { minutes: number; count: number } | number>;
  totalMinutes?: number;
  streak?: number;
}

export const ProductivityHeatmap: React.FC<ProductivityHeatmapProps> = ({
  data,
  totalMinutes = 0,
  streak = 0,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    minutes: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Generate 53 weeks leading up to current week Saturday using UTC to prevent DST & timezone shifts
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayStr = todayUtc.toISOString().slice(0, 10);
  const days: { date: Date; dateStr: string; minutes: number; count: number; level: number }[] = [];

  // Determine end date as Saturday of current week to make full columns
  const endDayOfWeek = todayUtc.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const daysToSaturday = 6 - endDayOfWeek;
  const endDate = new Date(todayUtc);
  endDate.setUTCDate(todayUtc.getUTCDate() + daysToSaturday);

  // 53 weeks = 371 days (covers a full year cleanly)
  const totalDays = 53 * 7;
  const startDate = new Date(endDate);
  startDate.setUTCDate(endDate.getUTCDate() - totalDays + 1);

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const val = data[dateStr];
    const minutes = typeof val === 'number' ? val : val?.minutes || 0;
    const count = typeof val === 'number' ? Math.round(val / 25) : val?.count || 0;

    let level = 0;
    if (minutes > 0 && minutes < 25) level = 1;
    else if (minutes >= 25 && minutes < 50) level = 2;
    else if (minutes >= 50 && minutes < 100) level = 3;
    else if (minutes >= 100) level = 4;

    days.push({
      date: d,
      dateStr,
      minutes,
      count,
      level,
    });
  }

  // Group into columns of 7 days (weeks)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Determine month labels based on the first day of each week
  const months: { name: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wIdx) => {
    const firstDay = week[0].date;
    const m = firstDay.getUTCMonth();
    if (m !== lastMonth && wIdx % 4 === 0) {
      months.push({
        name: firstDay.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        weekIndex: wIdx,
      });
      lastMonth = m;
    }
  });

  const getCellColor = (level: number, isFuture: boolean) => {
    if (isFuture) {
      return 'bg-transparent border border-dashed border-slate-200 dark:border-slate-800 opacity-20';
    }
    switch (level) {
      case 1:
        return 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80';
      case 2:
        return 'bg-emerald-200 dark:bg-emerald-800 border border-emerald-300 dark:border-emerald-700';
      case 3:
        return 'bg-emerald-400 dark:bg-emerald-600 border border-emerald-500 dark:border-emerald-500 shadow-xs';
      case 4:
        return 'bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300 shadow-xs';
      default:
        return 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm select-none relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            📊 Focus Heatmap (Last 365 Days)
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 font-medium">
              🔥 {streak} day streak
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Total Study Time: <strong className="text-slate-700 dark:text-slate-200">{totalMinutes} min</strong> (
          {(totalMinutes / 60).toFixed(1)} hrs)
        </div>
      </div>

      {/* Grid container with horizontal scroll for responsiveness */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[680px]">
          {/* Months header */}
          <div className="flex text-[10px] text-slate-400 dark:text-slate-500 mb-1 pl-6">
            {weeks.map((_, wIdx) => {
              const monthLabel = months.find((m) => m.weekIndex === wIdx);
              return (
                <div key={wIdx} className="w-[12px] mr-[3px] text-left">
                  {monthLabel ? monthLabel.name : ''}
                </div>
              );
            })}
          </div>

          <div className="flex">
            {/* Days of week labels */}
            <div className="flex flex-col justify-between text-[9px] text-slate-400 dark:text-slate-500 pr-1.5 py-0.5 w-5">
              <span>Sun</span>
              <span>Tue</span>
              <span>Thu</span>
              <span>Sat</span>
            </div>

            {/* Heatmap Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const isFuture = day.dateStr > todayStr;
                    return (
                      <div
                        key={day.dateStr}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredDay({
                            dateStr: day.dateStr,
                            minutes: day.minutes,
                            count: day.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-[11px] h-[11px] rounded-[2px] transition-all duration-100 ${getCellColor(
                          day.level,
                          isFuture
                        )} ${
                          day.dateStr === todayStr
                            ? 'ring-1 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900'
                            : ''
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 bg-slate-900 dark:bg-slate-950 text-white text-xs rounded-md shadow-lg border border-slate-700/60 whitespace-nowrap"
          style={{
            left: `${hoveredDay.x}px`,
            top: `${hoveredDay.y - 6}px`,
          }}
        >
          <div className="font-semibold">{hoveredDay.dateStr}</div>
          <div className="text-emerald-400">
            {hoveredDay.minutes > 0
              ? `${hoveredDay.minutes} min focused (${hoveredDay.count} sessions)`
              : 'No focus recorded'}
          </div>
        </div>
      )}

      {/* Footer & Legend */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="text-[10px]">365-day Activity Matrix</div>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-800 border border-emerald-300 dark:border-emerald-700" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-600 border border-emerald-500 dark:border-emerald-500" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 dark:bg-emerald-400 border border-emerald-700 dark:border-emerald-300" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
