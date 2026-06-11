import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cron Trigger Logic: Mocking match updates for now
    const pastMatches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        kickoffTimeUTC: { lt: new Date() }
      }
    });

    let updatedCount = 0;
    for (const match of pastMatches) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'FINISHED',
          homeScore: Math.floor(Math.random() * 4),
          awayScore: Math.floor(Math.random() * 4)
        }
      });
      updatedCount++;
    }

    return NextResponse.json({ message: 'Cron sync completed', updatedMatches: updatedCount });

  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
