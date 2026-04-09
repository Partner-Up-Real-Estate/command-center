// Facebook Graph API wrapper
// Requires META_APP_ID + META_APP_SECRET env vars

const GRAPH_API = 'https://graph.facebook.com/v19.0'

export interface FacebookPage {
  id: string
  name: string
  access_token: string
  fan_count?: number
  picture?: { data: { url: string } }
}

export interface FacebookPost {
  id: string
  message?: string
  story?: string
  created_time: string
  likes?: { summary: { total_count: number } }
  comments?: { summary: { total_count: number } }
}

export async function getFacebookPages(userAccessToken: string): Promise<FacebookPage[]> {
  const res = await fetch(`${GRAPH_API}/me/accounts?access_token=${userAccessToken}`)
  if (!res.ok) throw new Error(`Facebook API error: ${res.statusText}`)
  const data = await res.json()
  return data.data || []
}

export async function postToFacebookPage(
  pageAccessToken: string,
  pageId: string,
  message: string,
  link?: string
): Promise<string> {
  const body: Record<string, string> = { message, access_token: pageAccessToken }
  if (link) body.link = link

  const res = await fetch(`${GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to post to Facebook')
  const data = await res.json()
  return data.id
}

export async function getFacebookPagePosts(pageAccessToken: string, pageId: string, limit = 20): Promise<FacebookPost[]> {
  const fields = 'id,message,story,created_time,likes.summary(true),comments.summary(true)'
  const res = await fetch(`${GRAPH_API}/${pageId}/posts?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`)
  if (!res.ok) throw new Error(`Facebook API error: ${res.statusText}`)
  const data = await res.json()
  return data.data || []
}

export function getFacebookAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/connect/facebook/callback`,
    scope: 'pages_manage_posts,pages_read_engagement,pages_show_list,publish_to_groups',
    response_type: 'code',
  })
  return `https://www.facebook.com/dialog/oauth?${params}`
}
