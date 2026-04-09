'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import type { Platform } from './PlatformCards';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const Line = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), { ssr: false });

interface EngagementChartProps {
  platform: Platform | 'all';
}

const EngagementChart: React.FC<EngagementChartProps> = ({ platform }) => {
  const chartData = useMemo(() => {
    const now = new Date();
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    const baseMultiplier = platform === 'all' ? 2.5 : 1;

    const platformMultipliers: Record<string, number> = {
      instagram: 1.0,
      facebook: 0.8,
      linkedin: 0.5,
      tiktok: 2.0,
      youtube: 1.3,
      all: 2.5,
    };

    const mult = platformMultipliers[platform] || 1.0;

    const likes = Array.from({ length: 30 }, () =>
      Math.floor((Math.random() * 200 + 100) * mult)
    );
    const comments = Array.from({ length: 30 }, () =>
      Math.floor((Math.random() * 50 + 20) * mult)
    );

    return {
      labels: days,
      datasets: [
        {
          label: 'Likes',
          data: likes,
          borderColor: '#378ADD',
          backgroundColor: 'rgba(55, 138, 221, 0.1)',
          borderWidth: 2,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#378ADD',
          pointBorderColor: '#0D1117',
          pointBorderWidth: 2,
          tension: 0.4,
        },
        {
          label: 'Comments',
          data: comments,
          borderColor: '#534AB7',
          backgroundColor: 'rgba(83, 74, 183, 0.1)',
          borderWidth: 2,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#534AB7',
          pointBorderColor: '#0D1117',
          pointBorderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  }, [platform]);

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#8B949E',
          font: {
            size: 12,
            weight: 'normal' as const,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 17, 23, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#8B949E',
        borderColor: '#30363D',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: '#30363D',
          drawBorder: false,
        },
        ticks: {
          color: '#8B949E',
          font: {
            size: 11,
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: '#30363D',
          drawBorder: false,
        },
        ticks: {
          color: '#8B949E',
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-white font-medium text-lg capitalize">
          Engagement Trend {platform !== 'all' && `- ${platform}`}
        </h3>
        <p className="text-[#8B949E] text-sm mt-1">Last 30 days of likes and comments</p>
      </div>
      <div style={{ height: '300px', position: 'relative' }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default EngagementChart;
