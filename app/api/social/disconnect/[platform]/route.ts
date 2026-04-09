import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the social token
    await prisma.socialToken.delete({
      where: {
        userId_platform: {
          userId: user.id,
          platform,
        },
      },
    });

    console.log(`Disconnected ${platform} for user ${user.id}`);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully disconnected ${platform}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect platform' },
      { status: 500 }
    );
  }
}
