// TikTok for Developers API wrapper
// Requires TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET env vars
// Note: TikTok API requires Business/Developer App approval

const TIKTOK_API = 'https://open.tiktokapis.com/v2'

export interface TikTokUser {
  open_id: string
  union_id: string
  avatar_url: string
  display_name: string
  follower_count: number
  following_count: number
  likes_count: number
  video_count: number
}

export interface TikTokVideo {
  id: string
  title: string
  cover_image_url: string
  share_url: string
  create_time: number
  duration: number
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
}

export async function getTikTokUser(accessToken: string): Promise<TikTokUser> {
  const res = await fetch(`${TIKTOK_API}/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count,following_count,likes_count,video_count`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`TikTok API error: ${res.statusText}`)
  const data = await res.json()
  return data.data?.user
}

export async function getTikTokVideos(accessToken: string, maxCount = 20): Promise<TikTokVideo[]> {
  const res = await fetch(`${TIKTOK_API}/video/list/?fields=id,title,cover_image_url,share_url,create_time,duration,view_count,like_count,comment_count,share_count`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ max_count: maxCount }),
  })
  if (!res.ok) throw new Error(`TikTok API error: ${res.statusText}`)
  const data = await res.json()
  return data.data?.videos || []
}

export function getTikTokAuthUrl(): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/connect/tiktok/callback`,
    scope: 'user.info.basic,video.list',
    response_type: 'code',
  })
  return `https://www.tiktok.com/auth/authorize/?${params}`
}
