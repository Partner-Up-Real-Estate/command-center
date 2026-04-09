'use client'

import { useState } from 'react'
import type { Platform, TrackedPost, TrackedAccount } from '@/types/index'

interface TopPostsFeedProps {
  posts: (TrackedPost & { account: TrackedAccount })[]
  isLoading: boolean
}

type PlatformFilter = 'all' | Platform
type PostTypeFilter = 'all' | 'reel' | 'image' | 'carousel' | 'short'
type DateRangeFilter = '7d' | '30d' | '90d'
type SortBy = 'engagement' | 'likes' | 'views'

const InstagramIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="2" width="20" height="20" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 5 3.64 9.12 8.44 9.88v-7H7.9v-2.3h2.54V9.5c0-2.5 1.5-3.88 3.78-3.88 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.62.77-1.62 1.56v1.88h2.77l-.44 2.3h-2.33v7c4.8-.76 8.44-4.87 8.44-9.88 0-5.52-4.48-10-10-10z" />
  </svg>
)

const LinkedInIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

const TikTokIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.1 1.82 2.9 2.9 0 0 1 2.31-4.64 2.88 2.88 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.1A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

function getPlatformIcon(platform: Platform) {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon />
    case 'facebook':
      return <FacebookIcon />
    case 'linkedin':
      return <LinkedInIcon />
    case 'tiktok':
      return <TikTokIcon />
    case 'youtube':
      return <YouTubeIcon />
    default:
      return null
  }
}

function formatDate(date: Date | undefined): string {
  if (!date) return 'Unknown'
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Now'
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 30) return `${diffDays}d`
  return d.toLocaleDateString()
}

function filterPostByDate(post: TrackedPost, range: DateRangeFilter): boolean {
  if (!post.postedAt) return false
  const postDate = new Date(post.postedAt)
  const now = new Date()
  const diffMs = now.getTime() - postDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  switch (range) {
    case '7d':
      return diffDays <= 7
    case '30d':
      return diffDays <= 30
    case '90d':
      return diffDays <= 90
  }
}

export default function TopPostsFeed({ posts, isLoading }: TopPostsFeedProps) {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all')
  const [postTypeFilter, setPostTypeFilter] = useState<PostTypeFilter>('all')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d')
  const [sortBy, setSortBy] = useState<SortBy>('engagement')

  const filteredPosts = posts
    .filter((post) => platformFilter === 'all' || post.account.platform === platformFilter)
    .filter((post) => postTypeFilter === 'all' || post.postType === postTypeFilter)
    .filter((post) => filterPostByDate(post, dateRange))
    .sort((a, b) => {
      if (sortBy === 'engagement') {
        return (b.engagementRate || 0) - (a.engagementRate || 0)
      } else if (sortBy === 'likes') {
        return b.likes - a.likes
      } else {
        return b.views - a.views
      }
    })

  const SkeletonRow = () => (
    <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex gap-4 animate-pulse">
      <div className="w-20 h-20 bg-[#0D1117] rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-[#0D1117] rounded w-1/3" />
        <div className="h-3 bg-[#0D1117] rounded w-2/3" />
        <div className="h-3 bg-[#0D1117] rounded w-1/2" />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Platform Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#8B949E] mb-2">Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm focus:outline-none focus:border-[#378ADD] transition-colors"
            >
              <option value="all">All Platforms</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>

          {/* Post Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#8B949E] mb-2">Type</label>
            <select
              value={postTypeFilter}
              onChange={(e) => setPostTypeFilter(e.target.value as PostTypeFilter)}
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm focus:outline-none focus:border-[#378ADD] transition-colors"
            >
              <option value="all">All Types</option>
              <option value="reel">Reel</option>
              <option value="image">Image</option>
              <option value="carousel">Carousel</option>
              <option value="short">Short</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-xs font-semibold text-[#8B949E] mb-2">Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm focus:outline-none focus:border-[#378ADD] transition-colors"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold text-[#8B949E] mb-2">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white text-sm focus:outline-none focus:border-[#378ADD] transition-colors"
            >
              <option value="engagement">Engagement Rate</option>
              <option value="likes">Most Likes</option>
              <option value="views">Most Views</option>
            </select>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-3">
        {isLoading ? (
          <>
            {[...Array(5)].map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-12 text-center">
            <p className="text-[#8B949E] text-sm">
              Add tracked accounts above to see top-performing posts.
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const totalEngagement = post.likes + post.comments + post.views
            const engagementRate = totalEngagement > 0 ? ((totalEngagement / Math.max(post.views || 1, 1)) * 100).toFixed(1) : '0'

            return (
              <div
                key={post.id}
                className="bg-[#161B22] border border-[#30363D] rounded-xl p-4 flex gap-4 hover:border-[#378ADD] transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 flex-shrink-0 bg-[#0D1117] border border-[#30363D] rounded-lg flex items-center justify-center text-[#8B949E] overflow-hidden">
                  {post.thumbnailUrl ? (
                    <img src={post.thumbnailUrl} alt="post" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                    </svg>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-[#378ADD]">
                      {getPlatformIcon(post.account.platform)}
                    </div>
                    <span className="text-white font-semibold text-sm">@{post.account.handle}</span>
                    {post.postType && (
                      <span className="text-xs px-2 py-1 bg-[#0D1117] text-[#8B949E] rounded border border-[#30363D]">
                        {post.postType}
                      </span>
                    )}
                  </div>

                  {/* Caption */}
                  <p className="text-[#8B949E] text-sm line-clamp-2 mb-3">
                    {post.caption || 'No caption'}
                  </p>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6E7681]">
                    <span>📌 {post.likes.toLocaleString()} likes</span>
                    <span>💬 {post.comments.toLocaleString()} comments</span>
                    <span>👁️ {post.views.toLocaleString()} views</span>
                    <span className="text-[#378ADD] font-semibold">{engagementRate}%</span>
                    <span className="ml-auto">{formatDate(post.postedAt)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
