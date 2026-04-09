import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

const ALLOWED_EMAIL = 'jarrett@whiteridge.ca'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    error?: string
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw data
    return {
      ...token,
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
      refreshToken: data.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error('Error refreshing access token', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (user.email !== ALLOWED_EMAIL) {
        return false
      }
      // Sync user to Supabase on sign-in
      try {
        const { getOrCreateUser } = await import('@/lib/supabase')
        await getOrCreateUser(user.email!, user.name, user.image)
      } catch (err) {
        console.error('Failed to sync user to Supabase:', err)
        // Don't block sign-in if Supabase is down
      }
      return true
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        }
      }
      // Return previous token if not expired
      if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
        return token
      }
      // Token expired, refresh
      return refreshAccessToken(token)
    },
    async session({ session, token }): Promise<Session> {
      if (session.user) {
        session.accessToken = token.accessToken as string
      }
      return session
    },
  },
}
