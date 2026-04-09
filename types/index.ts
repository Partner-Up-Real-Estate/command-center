export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: string
  description?: string
  location?: string
  attendees?: { email: string; displayName?: string; responseStatus?: string }[]
  hangoutLink?: string
  conferenceData?: { entryPoints?: { entryPointType: string; uri?: string; label?: string; pin?: string }[] }
  creator?: { email?: string; displayName?: string }
  organizer?: { email?: string; displayName?: string }
  htmlLink?: string
}

export interface DailyBlock {
  id: string
  startTime: string
  endTime: string
  title: string
  category: BlockCategory
  color: string
  tasks: string[]
}

export type BlockCategory = 'mortgage' | 'broki' | 'personal' | 'content' | 'ops' | 'referrals'

export interface DayState {
  checklist: Record<string, boolean>
  scorecard: Record<number, boolean>
  kpis: {
    convos: number
    booked: number
  }
}

export type Platform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube'

export interface SocialPost {
  id: string
  userId: string
  caption: string
  mediaUrl?: string
  mediaType?: string
  platforms: Platform[]
  scheduledAt?: Date
  postedAt?: Date
  status: 'draft' | 'scheduled' | 'posted'
  platformPostIds?: Record<Platform, string>
  createdAt: Date
}

export interface TrackedAccount {
  id: string
  userId: string
  platform: Platform
  handle: string
  displayName?: string
  followerCount?: number
  lastFetched?: Date
}

export interface TrackedPost {
  id: string
  accountId: string
  platformPostId: string
  caption?: string
  thumbnailUrl?: string
  postType?: string
  likes: number
  comments: number
  views: number
  shares: number
  postedAt?: Date
  engagementRate?: number
}

export interface Hook {
  id: string
  userId: string
  text: string
  label?: string
  generatedAt: Date
  usedAt?: Date
}

export interface IntercomWindow {
  time: string
  label: string
}

export type CommandAction =
  | { type: 'check_tasks'; items: { blockId: string; taskIndex: number }[] }
  | { type: 'update_kpi'; field: 'convos' | 'booked'; value: number }
  | { type: 'check_scorecard'; indices: number[] }
  | { type: 'create_event'; title: string; date: string; time: string; duration: number; attendees?: string[]; attendeeDetails?: { name: string; email: string }[] }
  | { type: 'message'; text: string }
