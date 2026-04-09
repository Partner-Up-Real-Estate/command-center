'use client';

import React from 'react';
import type { SocialToken } from '@/types/social';

export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube';

interface PlatformCardsProps {
  tokens: SocialToken[] | null;
  onConnect: (platform: Platform) => void;
  onDisconnect: (platform: Platform) => void;
}

interface PlatformConfig {
  name: string;
  id: Platform;
  color: string;
  icon: React.ReactNode;
}

const PlatformCards: React.FC<PlatformCardsProps> = ({ tokens, onConnect, onDisconnect }) => {
  const getToken = (platform: Platform) => {
    return tokens?.find(t => t.platform === platform);
  };

  const platforms: PlatformConfig[] = [
    {
      name: 'Instagram',
      id: 'instagram',
      color: 'from-pink-400 to-purple-600',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="4.5" className="stroke-white" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3.5" className="stroke-white" strokeWidth="1.5" fill="none" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
        </svg>
      ),
    },
    {
      name: 'Facebook',
      id: 'facebook',
      color: 'bg-blue-600',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 5 3.64 9.12 8.44 9.88v-7H7.9v-2.3h2.54V9.5c0-2.5 1.5-3.88 3.78-3.88 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.62.77-1.62 1.56v1.88h2.77l-.44 2.3h-2.33v7c4.8-.76 8.44-4.87 8.44-9.88 0-5.52-4.48-10-10-10z" />
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      id: 'linkedin',
      color: 'bg-blue-700',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      ),
    },
    {
      name: 'TikTok',
      id: 'tiktok',
      color: 'bg-black',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path
            d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.9 2.9 0 0 1 2.31-4.64 2.88 2.88 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.1A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"
            fill="white"
          />
        </svg>
      ),
    },
    {
      name: 'YouTube',
      id: 'youtube',
      color: 'bg-red-600',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {platforms.map(platform => {
        const token = getToken(platform.id);
        const isConnected = !!token;

        return (
          <div
            key={platform.id}
            className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex flex-col gap-3 hover:border-[#378ADD] transition-colors"
          >
            {/* Platform Icon */}
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                platform.id === 'instagram'
                  ? 'bg-gradient-to-br from-pink-400 to-purple-600'
                  : platform.id === 'facebook'
                    ? 'bg-blue-600'
                    : platform.id === 'linkedin'
                      ? 'bg-blue-700'
                      : platform.id === 'tiktok'
                        ? 'bg-black'
                        : 'bg-red-600'
              }`}
            >
              {platform.icon}
            </div>

            {/* Platform Name */}
            <h3 className="text-white font-medium text-sm">{platform.name}</h3>

            {/* Status */}
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}
              />
              <div className="flex flex-col flex-1 min-w-0">
                {isConnected ? (
                  <>
                    <span className="text-green-400 font-medium truncate">Connected</span>
                    <span className="text-[#8B949E] text-xs truncate">
                      @{token.username || 'unknown'}
                    </span>
                    <span className="text-[#8B949E] text-xs">
                      {token.followerCount?.toLocaleString() || '0'} followers
                    </span>
                    {token.lastPost && (
                      <span className="text-[#8B949E] text-xs">
                        {formatLastPostDate(token.lastPost)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[#8B949E]">Not connected</span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => (isConnected ? onDisconnect(platform.id) : onConnect(platform.id))}
              className={`mt-auto py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                isConnected
                  ? 'bg-[#0D1117] text-red-400 border border-[#30363D] hover:bg-red-600 hover:text-white hover:border-red-600'
                  : 'bg-[#378ADD] text-white hover:bg-[#2E6BA3]'
              }`}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

function formatLastPostDate(date: Date | string): string {
  const postDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - postDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
}

export default PlatformCards;
