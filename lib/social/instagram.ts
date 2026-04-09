// Instagram / Meta Graph API wrapper
// Requires META_APP_ID + META_APP_SECRET env vars
// Full integration requires Meta App Review approval

export interface InstagramProfile {
  id: string
  username: string
  name: string
  followers_count: number
  media_count: number
  profile_picture_url: string
}

export interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

const GRAPH_API = 'https://graph.instagram.com/v19.0'

export async function getInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const res = await fetch(
    `${GRAPH_API}/me?fields=id,username,name,followers_count,media_count,profile_picture_url&access_token=${accessToken}`
  )
  if (!res.ok) throw new Error(`Instagram API error: ${res.statusText}`)
  return res.json()
}

export async function getInstagramMedia(accessToken: string, limit = 20): Promise<InstagramMedia[]> {
  const res = await fetch(
    `${GRAPH_API}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=${limit}&access_token=${accessToken}`
  )
  if (!res.ok) throw new Error(`Instagram API error: ${res.statusText}`)
  const data = await res.json()
  return data.data || []
}

export async function postInstagramImage(accessToken: string, imageUrl: string, caption: string): Promise<string> {
  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH_API}/me/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  })
  if (!containerRes.ok) throw new Error('Failed to create Instagram media container')
  const { id: containerId } = await containerRes.json()

  // Step 2: Publish
  const publishRes = await fetch(`${GRAPH_API}/me/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
  })
  if (!publishRes.ok) throw new Error('Failed to publish Instagram post')
  const { id } = await publishRes.json()
  return id
}

export function getInstagramAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/connect/instagram/callback`,
    scope: 'instagram_basic,instagram_content_publish,instagram_manage_insights',
    response_type: 'code',
  })
  return `https://api.instagram.com/oauth/authorize?${params}`
}
