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
      label: 'Today Events',
      value: eventsCount,
      unit: '',
      icon: '📅',
      color: 'from-blue-600 to-blue-800',
    },
    {
      label: 'Task Completion',
      value: completionPercentage,
      unit: '%',
      icon: '✓',
      color: 'from-green-600 to-green-800',
    },
    {
      label: 'Daily Score',
      value: scorePercentage,
      unit: '%',
      icon: '⭐',
      color: 'from-amber-600 to-amber-800',
    },
    {
      label: 'Conversations',
      value: convos,
      unit: '',
      icon: '💬',
      color: 'from-purple-600 to-purple-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`bg-gradient-to-br ${metric.color} rounded-lg p-4 shadow-md border border-gray-700 border-opacity-50`}
        >
          <div className="flex items-start justify-between">
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
