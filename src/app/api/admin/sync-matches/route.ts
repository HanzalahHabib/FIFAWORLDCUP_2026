import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Authenticate & Verify Admin Role
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Fetch or Mock Match Data
    // We would use fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026') here
    // For now, we mock the logic if live data is empty.
    
    // Demo Mock Sync: Updates random past matches with scores
    const pastMatches = await prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        kickoffTimeUTC: { lt: new Date() }
      }
    });

    let updatedCount = 0;
    for (const match of pastMatches) {
      const homeScore = Math.floor(Math.random() * 4);
      const awayScore = Math.floor(Math.random() * 4);
      
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'FINISHED',
          homeScore,
          awayScore
        }
      });
      updatedCount++;
    }

    return NextResponse.json({
      message: 'Sync completed successfully',
      updatedMatches: updatedCount
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
