// Re-export from main types file to avoid duplicate definitions
export type { Platform, SocialPost, TrackedAccount, TrackedPost, Hook } from './index'

export interface SocialToken {
  id: string
  userId: string
  platform: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  platformUserId?: string
  platformUsername?: string
  followerCount?: number
  lastPost?: Date
}

export interface Post {
  id: string
  userId: string
  caption: string
  mediaUrl?: string | null
  mediaType?: string | null
  platforms: string
  status: 'draft' | 'scheduled' | 'posted' | 'failed'
  postedAt?: Date | null
  scheduledAt?: Date | null
  createdAt: Date
}

export interface AnalyticsData {
  platform: string
  followers: number
  followerTrend: 'up' | 'down' | 'flat'
  reach: number
  engagementRate: number
  bestPost: {
    caption: string
    likes: number
    engagement: number
  } | null
}
