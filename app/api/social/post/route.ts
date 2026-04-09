import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface PostRequest {
  caption: string;
  mediaUrl?: string;
  mediaType?: string;
  platforms: string[];
  scheduledAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: PostRequest = await request.json();

    // Validation
    if (!body.caption || !body.platforms || body.platforms.length === 0) {
      return NextResponse.json(
        { error: 'Caption and at least one platform are required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine post status
    const isScheduled = !!body.scheduledAt;
    const scheduledDate = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const status = isScheduled ? 'scheduled' : 'posted';

    // Create post in database
    const post = await prisma.post.create({
      data: {
        userId: user.id,
        caption: body.caption,
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        platforms: body.platforms,
        status,
        postedAt: isScheduled ? null : new Date(),
        scheduledAt: scheduledDate,
        likes: 0,
        comments: 0,
      },
    });

    // TODO: Integration with actual platform APIs would happen here
    // For now, we log the post and return success
    console.log(`Post ${status}:`, {
      postId: post.id,
      platforms: body.platforms,
      caption: body.caption.substring(0, 50),
      scheduledAt: scheduledDate?.toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        post: {
          id: post.id,
          caption: post.caption,
          platforms: post.platforms,
          status: post.status,
          postedAt: post.postedAt,
          scheduledAt: post.scheduledAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Post creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
