'use client';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees?: string[];
}

interface WeekActivityChartProps {
  weekEvents: Record<string, CalendarEvent[]>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function WeekActivityChart({ weekEvents }: WeekActivityChartProps) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const maxEvents = Math.max(
    ...days.map((day) => {
      const dateStr = day.toISOString().split('T')[0];
      return (weekEvents[dateStr] || []).length;
    }),
    5
  );

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-4">Weekly Activity</h3>
      <div className="flex items-end gap-2 h-40">
        {days.map((day, index) => {
          const dateStr = day.toISOString().split('T')[0];
          const eventCount = (weekEvents[dateStr] || []).length;
          const percentage = (eventCount / maxEvents) * 100;
          const dayName = DAY_NAMES[day.getDay()];

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-gray-800 rounded-t-lg relative h-32 flex items-end">
                <div
                  className="w-full bg-gradient-to-t from-[#378ADD] to-cyan-600 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                  style={{ height: `${Math.max(percentage, 5)}%` }}
                  title={`${eventCount} events`}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-white">{dayName.slice(0, 3)}</p>
                <p className="text-xs text-gray-400">{eventCount}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
