import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        socialTokens: true,
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate mock analytics data for connected platforms
    const mockAnalytics = user.socialTokens.map(token => {
      const baseFollowers: Record<string, number> = {
        instagram: 2840,
        facebook: 5200,
        linkedin: 1950,
        tiktok: 12450,
        youtube: 8500,
      };

      return {
        platform: token.platform,
        followers: baseFollowers[token.platform] || 0,
        reach: Math.floor((baseFollowers[token.platform] || 0) * 0.65),
        engagementRate: Math.floor(Math.random() * 8) + 2,
      };
    });

    // Transform posts to include platform info
    const posts = user.posts.map(post => ({
      id: post.id,
      caption: post.caption,
      platforms: post.platforms,
      status: post.status,
      postedAt: post.postedAt,
      scheduledAt: post.scheduledAt,
      likes: post.likes,
      comments: post.comments,
    }));

    return NextResponse.json(
      {
        tokens: user.socialTokens,
        posts,
        analytics: mockAnalytics,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
