'use client';

interface WeekStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventDates: string[];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekStrip({ selectedDate, onSelectDate, eventDates }: WeekStripProps) {
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

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
    const dateStr = date.toISOString().split('T')[0];
    return eventDates.includes(dateStr);
  };

  return (
    <div className="w-full mb-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-2">Week View</h3>
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
