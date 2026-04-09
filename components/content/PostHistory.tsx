'use client';

import React, { useState } from 'react';
import type { Post } from '@/types/social';

interface PostHistoryProps {
  posts: Post[];
  isLoading: boolean;
}

type StatusType = 'draft' | 'scheduled' | 'posted' | 'failed';

const PostHistory: React.FC<PostHistoryProps> = ({ posts, isLoading }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-600 text-gray-100';
      case 'scheduled':
        return 'bg-amber-600 text-amber-100';
      case 'posted':
        return 'bg-green-600 text-green-100';
      case 'failed':
        return 'bg-red-600 text-red-100';
      default:
        return 'bg-gray-600 text-gray-100';
    }
  };

  const getStatusLabel = (status: string): StatusType => {
    return (status || 'draft') as StatusType;
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} days ago`;
    if (diffHours > 0) return `${diffHours} hours ago`;
    if (diffMins > 0) return `${diffMins} minutes ago`;
    return 'Just now';
  };

  const paginatedPosts = posts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(posts.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-[#30363D] rounded w-2/3 mb-3" />
            <div className="h-3 bg-[#30363D] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-12 text-center">
        <p className="text-[#8B949E]">No posts yet. Create your first post above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div className="col-span-4 text-[#8B949E] text-sm font-medium">Caption</div>
        <div className="col-span-2 text-[#8B949E] text-sm font-medium">Platforms</div>
        <div className="col-span-2 text-[#8B949E] text-sm font-medium">Status</div>
        <div className="col-span-2 text-[#8B949E] text-sm font-medium">Posted</div>
        <div className="col-span-2 text-[#8B949E] text-sm font-medium">Engagement</div>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {paginatedPosts.map(post => {
          const statusLabel = getStatusLabel(post.status);
          return (
            <div
              key={post.id}
              className="grid grid-cols-12 gap-4 bg-[#161B22] hover:bg-[#1C2333] rounded-lg p-4 transition-colors"
            >
              {/* Caption */}
              <div className="col-span-4">
                <p className="text-white text-sm truncate" title={post.caption}>
                  {post.caption.substring(0, 60)}
                  {post.caption.length > 60 ? '...' : ''}
                </p>
              </div>

              {/* Platforms */}
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">
                  {(JSON.parse(post.platforms || '[]') as string[]).map(platform => (
                    <span
                      key={platform}
                      className="inline-block bg-[#0D1117] border border-[#30363D] rounded px-2 py-1 text-[#8B949E] text-xs"
                    >
                      {platform.substring(0, 2).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(statusLabel)}`}>
                  {statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}
                </span>
              </div>

              {/* Posted/Scheduled Time */}
              <div className="col-span-2">
                <p className="text-[#8B949E] text-sm">
                  {statusLabel === 'scheduled' && post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleDateString() +
                      ' ' +
                      new Date(post.scheduledAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : formatTime(post.postedAt ?? null)}
                </p>
              </div>

              {/* Engagement */}
              <div className="col-span-2">
                <div className="flex items-center gap-2 text-sm text-[#8B949E]">
                  <span>❤️ {post.likes || '--'}</span>
                  <span>💬 {post.comments || '--'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-[#161B22] border border-[#30363D] rounded-lg text-[#8B949E] hover:border-[#378ADD] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <span className="text-[#8B949E] text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-[#161B22] border border-[#30363D] rounded-lg text-[#8B949E] hover:border-[#378ADD] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PostHistory;
