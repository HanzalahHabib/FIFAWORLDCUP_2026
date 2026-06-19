import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

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

    // 2. Fetch all resolved custom polls
    const resolvedPolls = await prisma.poll.findMany({
      where: {
        OR: [
          { resultTeamId: { not: null } },
          { resultOption: { not: null } }
        ]
      }
    });

    // 3. Fetch global settings for tournament actual outcomes
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });

    // 4. Fetch all users, their picks and poll votes
    const users = await prisma.user.findMany({
      include: { 
        picks: true,
        pollVotes: true
      }
    });

    let updatedUsers = 0;

    // 5. Calculate Total Points for each user
    for (const user of users) {
      let totalPoints = 0;
      
      // A. Match prediction points (+1 per correct pick)
      for (const pick of user.picks) {
        if (actualResults.has(pick.matchId)) {
          if (pick.prediction === actualResults.get(pick.matchId)) {
            totalPoints += 1;
          }
        }
      }

      // B. Custom Poll votes points (+2 per correct vote)
      for (const poll of resolvedPolls) {
        const userVote = user.pollVotes.find(v => v.pollId === poll.id);
        if (userVote) {
          if (poll.resultTeamId && userVote.teamId === poll.resultTeamId) {
            totalPoints += 2;
          } else if (poll.resultOption && userVote.option === poll.resultOption) {
            totalPoints += 2;
          }
        }
      }

      // C. Tournament end-game bonus points (+2 per correct bonus)
      if (settings) {
        if (settings.actualChampionId && user.firstPlaceId === settings.actualChampionId) {
          totalPoints += 2;
        }
        if (settings.actualUnbeatenTeamId && user.unbeatenTeamId === settings.actualUnbeatenTeamId) {
          totalPoints += 2;
        }
        if (settings.actualNoWinTeamId && user.noWinTeamId === settings.actualNoWinTeamId) {
          totalPoints += 2;
        }
      }

      // Update user if database value is out of sync
      if (user.points !== totalPoints) {
        await prisma.user.update({
          where: { id: user.id },
          data: { points: totalPoints }
        });
        updatedUsers++;
      }
    }

    return NextResponse.json({
      message: 'Scores recalculated successfully including Match Picks, Polls, and Bonuses.',
      updatedUsers
    });

  } catch (error) {
    console.error('Scoring Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
