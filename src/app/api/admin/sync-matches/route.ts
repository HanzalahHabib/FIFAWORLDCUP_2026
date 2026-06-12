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
    const apiKey = process.env.API_SPORTS_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API_SPORTS_KEY is not set in environment variables' }, { status: 500 });
    }

    const response = await fetch('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
      headers: {
        'x-rapidapi-host': 'v3.football.api-sports.io',
        'x-rapidapi-key': apiKey
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch matches from API' }, { status: 500 });
    }

    const data = await response.json();
    let updatedCount = 0;

    for (const fixture of data.response || []) {
      const apiFootballId = parseInt(fixture.fixture.id, 10);
      
      if (fixture.fixture.status.short === 'FT') {
        const homeScore = fixture.goals.home;
        const awayScore = fixture.goals.away;
        
        try {
          await prisma.match.updateMany({
            where: { apiFootballId },
            data: {
              status: 'FINISHED',
              homeScore,
              awayScore
            }
          });
          updatedCount++;
        } catch (e) {
          // match not found or update failed
        }
      }
    }

    return NextResponse.json({
      message: 'Sync completed successfully from API-Sports',
      updatedMatches: updatedCount
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
