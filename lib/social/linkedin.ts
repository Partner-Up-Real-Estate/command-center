// LinkedIn API wrapper
// Requires LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET env vars

const LINKEDIN_API = 'https://api.linkedin.com/v2'

export interface LinkedInProfile {
  id: string
  localizedFirstName: string
  localizedLastName: string
  profilePicture?: {
    'displayImage~': {
      elements: Array<{ identifiers: Array<{ identifier: string }> }>
    }
  }
}

export async function getLinkedInProfile(accessToken: string): Promise<LinkedInProfile> {
  const res = await fetch(`${LINKEDIN_API}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`LinkedIn API error: ${res.statusText}`)
  return res.json()
}

export async function postToLinkedIn(accessToken: string, authorUrn: string, text: string): Promise<string> {
  const body = {
    author: `urn:li:person:${authorUrn}`,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to post to LinkedIn')
  const id = res.headers.get('x-restli-id') || ''
  return id
}

export function getLinkedInAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/social/connect/linkedin/callback`,
    scope: 'r_liteprofile r_emailaddress w_member_social',
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}
