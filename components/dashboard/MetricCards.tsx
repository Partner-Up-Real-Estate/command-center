'use client';

interface MetricCardsProps {
  eventsCount: number;
  tasksCompleted: number;
  tasksTotal: number;
  score: number;
  convos: number;
}

export default function MetricCards({
  eventsCount,
  tasksCompleted,
  tasksTotal,
  score,
  convos,
}: MetricCardsProps) {
  const completionPercentage = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const scorePercentage = 60;

  const metrics = [
    {
      label: 'Events',
      shortLabel: 'Events',
      value: eventsCount,
      unit: '',
      icon: '📅',
      accent: 'text-blue-400',
      bg: 'from-blue-600/20 to-blue-800/20',
      border: 'border-blue-500/30',
    },
    {
      label: 'Task Completion',
      shortLabel: 'Tasks',
      value: completionPercentage,
      unit: '%',
      icon: '✓',
      accent: 'text-green-400',
      bg: 'from-green-600/20 to-green-800/20',
      border: 'border-green-500/30',
    },
    {
      label: 'Daily Score',
      shortLabel: 'Score',
      value: scorePercentage,
      unit: '%',
      icon: '⭐',
      accent: 'text-amber-400',
      bg: 'from-amber-600/20 to-amber-800/20',
      border: 'border-amber-500/30',
    },
    {
      label: 'Conversations',
      shortLabel: 'Convos',
      value: convos,
      unit: '',
      icon: '💬',
      accent: 'text-purple-400',
      bg: 'from-purple-600/20 to-purple-800/20',
      border: 'border-purple-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${metric.bg} rounded-lg p-2 md:p-4 shadow-md border ${metric.border}`}
        >
          {/* Mobile: compact, no icon, single row */}
          <div className="md:hidden text-center">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide truncate">
              {metric.shortLabel}
            </p>
            <p className={`text-lg font-bold ${metric.accent} mt-0.5 leading-tight`}>
              {metric.value}
              {metric.unit && <span className="text-xs font-normal">{metric.unit}</span>}
            </p>
          </div>

          {/* Desktop: full card with icon */}
          <div className="hidden md:flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-300 font-medium">{metric.label}</p>
              <p className="text-2xl font-bold text-white mt-1">
                {metric.value}
                <span className="text-sm font-normal ml-1">{metric.unit}</span>
              </p>
            </div>
            <div className="text-2xl">{metric.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
