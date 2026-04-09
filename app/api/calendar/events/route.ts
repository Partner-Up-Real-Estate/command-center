import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWeekEvents, getCalendarEvents } from '@/lib/calendar';
import { NextRequest, NextResponse } from 'next/server';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  attendees?: string[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const weekStart = searchParams.get('weekStart');
    const date = searchParams.get('date');

    // If specific date is provided, return events for that day
    if (date) {
      try {
        // Parse YYYY-MM-DD without timezone shift by using T12:00 midday
        const eventDate = new Date(`${date}T12:00:00`);
        const events = await getCalendarEvents(session.accessToken, eventDate);
        return NextResponse.json({ events });
      } catch (error) {
        console.error('Failed to fetch calendar events for date:', error);
        return NextResponse.json({ events: [] });
      }
    }

    // If week start is provided, return events for the full week
    if (weekStart) {
      try {
        // Parse YYYY-MM-DD without timezone shift
        const weekStartDate = new Date(`${weekStart}T12:00:00`);
        const weekEvents = await getWeekEvents(session.accessToken, weekStartDate);
        return NextResponse.json({ weekEvents });
      } catch (error) {
        console.error('Failed to fetch week events:', error);
        return NextResponse.json({ weekEvents: {} });
      }
    }

    return NextResponse.json({ error: 'Missing weekStart or date parameter' }, { status: 400 });
  } catch (error) {
    console.error('Calendar events API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
