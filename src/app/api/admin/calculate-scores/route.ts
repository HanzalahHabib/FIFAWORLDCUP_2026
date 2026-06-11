import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch all finished matches
    const finishedMatches = await prisma.match.findMany({
      where: { status: 'FINISHED' }
    });

    // Determine actual results
    const actualResults = new Map<string, string>();
    for (const match of finishedMatches) {
      if (match.homeScore! > match.awayScore!) {
        actualResults.set(match.id, 'HOME');
      } else if (match.awayScore! > match.homeScore!) {
        actualResults.set(match.id, 'AWAY');
      } else {
        actualResults.set(match.id, 'DRAW');
      }
    }

    // 2. Fetch all users and their picks
    const users = await prisma.user.findMany({
      include: { picks: true }
    });

    let updatedUsers = 0;

    // 3. Calculate Base Scoring
    for (const user of users) {
      let totalPoints = 0;
      
      for (const pick of user.picks) {
        if (actualResults.has(pick.matchId)) {
          if (pick.prediction === actualResults.get(pick.matchId)) {
            totalPoints += 1;
          }
        }
      }

      // Bonus Logic (Simplified for demonstration - typically runs at tournament end)
      // Top 4, Unbeaten, No-Win would be evaluated here if tournament is marked as 'ENDED'
      // Example: if (tournamentEnded) { if (user.unbeatenTeamId === unbeatenTeam.id) totalPoints += 2; }

      // Update user
      if (user.points !== totalPoints) {
        await prisma.user.update({
          where: { id: user.id },
          data: { points: totalPoints }
        });
        updatedUsers++;
      }
    }

    return NextResponse.json({
      message: 'Scores recalculated successfully',
      updatedUsers
    });

  } catch (error) {
    console.error('Scoring Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
