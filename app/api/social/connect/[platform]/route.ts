import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

const OAUTH_URLS: Record<string, string> = {
  instagram:
    'https://api.instagram.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&scope=user_profile,user_media&response_type=code',
  facebook:
    'https://www.facebook.com/v18.0/dialog/oauth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&scope=pages_read_engagement,pages_manage_metadata',
  linkedin:
    'https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&scope=w_member_social,r_liteprofile',
  tiktok:
    'https://open-api.tiktok.com/platform/oauth/connect/?client_key=YOUR_CLIENT_KEY&redirect_uri=YOUR_CALLBACK_URL&scope=user.info.basic,video.list',
  youtube:
    'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&response_type=code&scope=https://www.googleapis.com/auth/youtube',
};

const SETUP_INSTRUCTIONS: Record<string, string> = {
  instagram:
    'To connect Instagram, you need to set up a Meta App and configure the Instagram Graph API. Visit https://developers.facebook.com to get started.',
  facebook:
    'To connect Facebook, you need to set up a Meta App and configure the Facebook Graph API. Visit https://developers.facebook.com to get started.',
  linkedin:
    'To connect LinkedIn, you need to register your app at https://www.linkedin.com/developers/apps and configure OAuth settings.',
  tiktok:
    'To connect TikTok, you need to register your app at https://developers.tiktok.com and configure OAuth settings.',
  youtube:
    'To connect YouTube, you need to set up a Google Cloud Project and configure YouTube API. Visit https://console.cloud.google.com to get started.',
};

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const platform = params.platform.toLowerCase();

    // Validate platform
    if (!['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    // For production, this would redirect to the actual OAuth URL
    // For now, return helpful instructions since OAuth approval is required
    return NextResponse.json(
      {
        message: `OAuth flow for ${platform} is pending API approval`,
        platform,
        setupInstructions: SETUP_INSTRUCTIONS[platform],
        oauthUrl: OAUTH_URLS[platform],
        note: 'This endpoint returns mock data for development. In production, this would redirect to the platform OAuth URL.',
        steps: [
          `1. Register your app at the ${platform} developer portal`,
          '2. Configure your redirect URI and obtain client credentials',
          '3. The OAuth flow will be fully automated once credentials are configured',
          '4. Users will authenticate and grant permissions via the platform',
          '5. The app will receive and store the access token securely',
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('OAuth connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
