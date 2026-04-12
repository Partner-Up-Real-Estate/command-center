'use client';

import { useState, useEffect } from 'react';

interface WeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates: string[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekStartSunday(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function WeekStrip({ selectedDate, onSelectDate, eventDates }: WeekStripProps) {
  // Track the currently viewed week independently of selectedDate
  const [viewWeekStart, setViewWeekStart] = useState<Date>(() => getWeekStartSunday(selectedDate));

  // When selectedDate changes externally (e.g. "Today" button), sync viewWeekStart
  useEffect(() => {
    const selWeekStart = getWeekStartSunday(selectedDate);
    if (selWeekStart.getTime() !== viewWeekStart.getTime()) {
      setViewWeekStart(selWeekStart);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(viewWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const goToPrevWeek = () => {
    const prev = new Date(viewWeekStart);
    prev.setDate(prev.getDate() - 7);
    setViewWeekStart(prev);
    // Also select the same day-of-week in the new week
    const dayOffset = selectedDate.getDay();
    const newSelected = new Date(prev);
    newSelected.setDate(newSelected.getDate() + dayOffset);
    onSelectDate(newSelected);
  };

  const goToNextWeek = () => {
    const next = new Date(viewWeekStart);
    next.setDate(next.getDate() + 7);
    setViewWeekStart(next);
    const dayOffset = selectedDate.getDay();
    const newSelected = new Date(next);
    newSelected.setDate(newSelected.getDate() + dayOffset);
    onSelectDate(newSelected);
  };

  const goToToday = () => {
    const today = new Date();
    setViewWeekStart(getWeekStartSunday(today));
    onSelectDate(today);
  };

  const handleSelectDate = (date: Date) => {
    onSelectDate(date);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const hasEvents = (date: Date) => {
    const dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Pacific/Honolulu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return eventDates.includes(dateStr);
  };

  // Check if "Today" is within the currently viewed week
  const todayInView = days.some(d => isToday(d));

  // Week label: "Apr 12 – 18, 2026"
  const weekEnd = days[6];
  const weekLabel = days[0].getMonth() === weekEnd.getMonth()
    ? `${MONTH_NAMES[days[0].getMonth()]} ${days[0].getDate()} – ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${MONTH_NAMES[days[0].getMonth()]} ${days[0].getDate()} – ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  return (
    <div className="w-full mb-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-400">{weekLabel}</h3>
          {!todayInView && (
            <button
              onClick={goToToday}
              className="text-[10px] font-bold uppercase tracking-wide text-[#378ADD] bg-[#378ADD]/10 border border-[#378ADD]/30 px-2 py-0.5 rounded-md hover:bg-[#378ADD]/20 transition-colors"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevWeek}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextWeek}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((date, index) => {
          const dayName = DAY_NAMES[date.getDay()];
          const dateNum = date.getDate();
          const selected = isSelected(date);
          const today = isToday(date);
          const eventsExists = hasEvents(date);

          return (
            <button
              key={index}
              onClick={() => handleSelectDate(date)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all flex-shrink-0 ${
                selected
                  ? 'bg-[#378ADD] text-white'
                  : today
                    ? 'bg-gray-700 text-white border border-[#378ADD]'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="text-xs font-medium">{dayName}</span>
              <span className="text-sm font-semibold">{dateNum}</span>
              {eventsExists && <div className="w-1.5 h-1.5 bg-[#378ADD] rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
