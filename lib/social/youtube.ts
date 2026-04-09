// YouTube Data API v3 wrapper
// Requires YOUTUBE_API_KEY env var (or OAuth for write access)

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

export interface YouTubeChannel {
  id: string
  snippet: {
    title: string
    description: string
    thumbnails: { default: { url: string }; medium: { url: string } }
  }
  statistics: {
    subscriberCount: string
    videoCount: string
    viewCount: string
  }
}

export interface YouTubeVideo {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    thumbnails: { medium: { url: string } }
    tags?: string[]
  }
  statistics: {
    viewCount: string
    likeCount: string
    commentCount: string
    favoriteCount: string
  }
}

export async function getYouTubeChannel(channelHandle: string): Promise<YouTubeChannel | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  const res = await fetch(
    `${YOUTUBE_API}/channels?part=snippet,statistics&forHandle=${channelHandle}&key=${apiKey}`
  )
  if (!res.ok) throw new Error(`YouTube API error: ${res.statusText}`)
  const data = await res.json()
  return data.items?.[0] || null
}

export async function getChannelVideos(channelId: string, maxResults = 20): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY

  // Get video IDs from channel uploads
  const searchRes = await fetch(
    `${YOUTUBE_API}/search?part=id&channelId=${channelId}&type=video&order=date&maxResults=${maxResults}&key=${apiKey}`
  )
  if (!searchRes.ok) throw new Error(`YouTube API error: ${searchRes.statusText}`)
  const searchData = await searchRes.json()
  const videoIds = searchData.items?.map((i: { id: { videoId: string } }) => i.id.videoId).join(',')

  if (!videoIds) return []

  // Get video statistics
  const videoRes = await fetch(
    `${YOUTUBE_API}/videos?part=snippet,statistics&id=${videoIds}&key=${apiKey}`
  )
  if (!videoRes.ok) throw new Error(`YouTube API error: ${videoRes.statusText}`)
  const videoData = await videoRes.json()
  return videoData.items || []
}
