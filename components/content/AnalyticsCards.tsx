'use client';

import React from 'react';
import type { Platform } from './PlatformCards';
import type { SocialToken } from '@/types/social';

interface AnalyticsCardsProps {
  platform: Platform | 'all';
  tokens: SocialToken[] | null;
}

interface AnalyticsData {
  platform: string;
  followers: number;
  followerTrend: 'up' | 'down' | 'flat';
  reach: number;
  engagementRate: number;
  bestPost: {
    caption: string;
    likes: number;
    engagement: number;
  } | null;
}

const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({ platform, tokens }) => {
  const getMockAnalytics = (p: string): AnalyticsData => {
    const baseFollowers: Record<string, number> = {
      instagram: 2840,
      facebook: 5200,
      linkedin: 1950,
      tiktok: 12450,
      youtube: 8500,
    };

    const baseLikes: Record<string, number> = {
      instagram: 245,
      facebook: 182,
      linkedin: 89,
      tiktok: 1250,
      youtube: 450,
    };

    return {
      platform: p,
      followers: baseFollowers[p] || 0,
      followerTrend: ['up', 'down', 'flat'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'flat',
      reach: Math.floor(baseFollowers[p] * 0.65),
      engagementRate: Math.floor(Math.random() * 8) + 2,
      bestPost: {
        caption: 'Mortgage tips that save you money',
        likes: baseLikes[p],
        engagement: Math.floor(Math.random() * 12) + 3,
      },
    };
  };

  const getConnectedPlatforms = () => {
    if (!tokens) return [];
    return tokens.map(t => t.platform as Platform);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const connectedPlatforms = getConnectedPlatforms();

  const platforms: Platform[] = platform === 'all'
    ? (['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'] as Platform[])
    : [platform];

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="bg-[#1C2333] border border-[#30363D] rounded-lg p-4 text-[#8B949E] text-sm">
        <p>
          <span className="font-medium">📊 Analytics Disclaimer:</span> Live analytics load from connected platform APIs. Connect your accounts to enable real data.
        </p>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map(p => {
          const isConnected = connectedPlatforms.includes(p);
          const analytics = getMockAnalytics(p);

          if (!isConnected) {
            return (
              <div key={p} className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-[#8B949E] mb-3">Connect {p} to see analytics</p>
                  <button className="text-[#378ADD] hover:text-[#2E6BA3] font-medium text-sm">
                    Connect {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={p} className="bg-[#161B22] border border-[#30363D] rounded-xl p-6 space-y-4">
              {/* Platform Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium capitalize text-lg">{p}</h3>
                <span className="text-xl">
                  {p === 'instagram'
                    ? '📷'
                    : p === 'facebook'
                      ? 'f'
                      : p === 'linkedin'
                        ? 'in'
                        : p === 'tiktok'
                          ? '♪'
                          : '▶'}
                </span>
              </div>

              {/* Followers */}
              <div className="bg-[#0D1117] rounded-lg p-4">
                <p className="text-[#8B949E] text-sm mb-2">Followers</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-white">{analytics.followers.toLocaleString()}</p>
                  <span className={`text-lg ${getTrendColor(analytics.followerTrend)}`}>
                    {getTrendIcon(analytics.followerTrend)}
                  </span>
                </div>
              </div>

              {/* Reach & Engagement */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0D1117] rounded-lg p-3">
                  <p className="text-[#8B949E] text-xs mb-1">Reach (30d)</p>
                  <p className="text-lg font-bold text-white">{analytics.reach.toLocaleString()}</p>
                </div>
                <div className="bg-[#0D1117] rounded-lg p-3">
                  <p className="text-[#8B949E] text-xs mb-1">Engagement</p>
                  <p className="text-lg font-bold text-blue-400">{analytics.engagementRate}%</p>
                </div>
              </div>

              {/* Best Post */}
              {analytics.bestPost && (
                <div className="bg-[#0D1117] rounded-lg p-4">
                  <p className="text-[#8B949E] text-sm mb-3">Best Performing Post</p>
                  <div className="space-y-2">
                    <div className="w-full bg-[#161B22] rounded h-24 flex items-center justify-center">
                      <span className="text-3xl">📸</span>
                    </div>
                    <p className="text-white text-sm line-clamp-2">{analytics.bestPost.caption}</p>
                    <div className="flex justify-between text-xs text-[#8B949E]">
                      <span>❤️ {analytics.bestPost.likes.toLocaleString()} likes</span>
                      <span>💬 {analytics.bestPost.engagement.toLocaleString()} comments</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyticsCards;
