'use client';

import React, { useState, useMemo } from 'react';
import type { TrackedPost } from '@/types/social';

interface TopPostsGridProps {
  posts: TrackedPost[];
  isLoading: boolean;
}

type SortOption = 'recent' | 'likes' | 'views';

const TopPostsGrid: React.FC<TopPostsGridProps> = ({ posts, isLoading }) => {
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const sortedPosts = useMemo(() => {
    const postsCopy = [...posts];
    switch (sortBy) {
      case 'likes':
        return postsCopy.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      case 'views':
        return postsCopy.sort((a, b) => (b.views || 0) - (a.views || 0));
      case 'recent':
      default:
        return postsCopy.sort((a, b) => {
          const dateA = new Date(a.postedAt || 0).getTime();
          const dateB = new Date(b.postedAt || 0).getTime();
          return dateB - dateA;
        });
    }
  }, [posts, sortBy]);

  const topPosts = sortedPosts.slice(0, 12);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-white font-medium text-lg">Top Posts</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden animate-pulse">
              <div className="w-full h-40 bg-[#30363D]" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-[#30363D] rounded w-3/4" />
                <div className="h-3 bg-[#30363D] rounded w-1/2" />
                <div className="flex gap-2 pt-2">
                  <div className="h-3 bg-[#30363D] rounded flex-1" />
                  <div className="h-3 bg-[#30363D] rounded flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-white font-medium text-lg">Top Posts</h3>
          <p className="text-[#8B949E] text-sm mt-1">Last 12 posts sorted by {sortBy}</p>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          {(['recent', 'likes', 'views'] as SortOption[]).map(option => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors capitalize ${
                sortBy === option
                  ? 'bg-[#378ADD] text-white'
                  : 'bg-[#161B22] text-[#8B949E] border border-[#30363D] hover:border-[#378ADD]'
              }`}
            >
              Most {option}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {topPosts.length === 0 ? (
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-12 text-center">
          <p className="text-[#8B949E]">No posts yet. Create your first post to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topPosts.map(post => {
            const platformEmojis: Record<string, string> = {
              instagram: '📷',
              facebook: 'f',
              linkedin: 'in',
              tiktok: '♪',
              youtube: '▶',
            };

            return (
              <div
                key={post.id}
                className="bg-[#161B22] border border-[#30363D] rounded-lg overflow-hidden hover:border-[#378ADD] transition-colors group"
              >
                {/* Thumbnail */}
                <div className="relative w-full h-40 bg-[#0D1117] flex items-center justify-center overflow-hidden">
                  {post.thumbnailUrl ? (
                    <img
                      src={post.thumbnailUrl}
                      alt={post.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <span className="text-3xl">📸</span>
                  )}

                  {/* Platform Badge */}
                  <div className="absolute top-2 right-2 bg-[#0D1117] border border-[#30363D] rounded-full w-8 h-8 flex items-center justify-center text-xs font-medium">
                    {platformEmojis[post.platform] || '📱'}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Caption */}
                  <p className="text-white text-sm line-clamp-2">{post.caption}</p>

                  {/* Engagement Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#30363D]">
                    <div className="text-center py-2">
                      <p className="text-xs text-[#8B949E]">Likes</p>
                      <p className="text-white font-medium">❤️ {post.likes?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-center py-2">
                      <p className="text-xs text-[#8B949E]">Comments</p>
                      <p className="text-white font-medium">💬 {post.comments?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="text-center py-2">
                      <p className="text-xs text-[#8B949E]">Views</p>
                      <p className="text-white font-medium">👁️ {post.views?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TopPostsGrid;
