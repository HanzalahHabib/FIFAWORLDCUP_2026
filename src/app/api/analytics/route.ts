import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    const users = await prisma.user.findMany({
      include: { picks: true }
    });

    // All matches that are past kickoff (locked) — picks are locked for these
    const lockedMatches = await prisma.match.findMany({
      where: { kickoffTimeUTC: { lt: now } }
    });

    const lockedMatchIds = new Set(lockedMatches.map(m => m.id));
    const lockedMatchesCount = lockedMatches.length;

    // Finished matches with valid scores — these can be graded
    const finishedMatchesCount = await prisma.match.count({
      where: { status: 'FINISHED' }
    });

    // Build actual result map from locked matches that have scores
    // We grade any locked match that has both homeScore and awayScore set,
    // regardless of DB status field (status may lag behind real time)
    const actualResults = new Map<string, string>(); // matchId -> 'HOME'|'AWAY'|'DRAW'
    for (const match of lockedMatches) {
      if (match.homeScore !== null && match.awayScore !== null) {
        if (match.homeScore > match.awayScore) {
          actualResults.set(match.id, 'HOME');
        } else if (match.awayScore > match.homeScore) {
          actualResults.set(match.id, 'AWAY');
        } else {
          actualResults.set(match.id, 'DRAW');
        }
      }
    }

    const analytics = {
      westSide: {
        totalUsers: 0,
        totalPoints: 0,
        // lockedPicks = picks submitted for matches that are now past kickoff
        lockedPicks: 0,
        // gradedPicks = locked picks where the result is also known
        gradedPicks: 0,
        correctPicks: 0,
        averagePoints: 0,
        // accuracy based on graded picks only
        accuracyPercent: 0
      },
      eastSide: {
        totalUsers: 0,
        totalPoints: 0,
        lockedPicks: 0,
        gradedPicks: 0,
        correctPicks: 0,
        averagePoints: 0,
        accuracyPercent: 0
      }
    };

    for (const user of users) {
      const cohort = (user.cohort === 'West Side' || user.cohort === 'US Team')
        ? analytics.westSide
        : analytics.eastSide;

      cohort.totalUsers += 1;
      cohort.totalPoints += user.points;

      for (const pick of user.picks) {
        // Only count picks for matches that are past kickoff
        if (!lockedMatchIds.has(pick.matchId)) continue;

        cohort.lockedPicks += 1;

        // If we have a result for this match, grade the pick
        if (actualResults.has(pick.matchId)) {
          cohort.gradedPicks += 1;
          if (pick.prediction === actualResults.get(pick.matchId)) {
            cohort.correctPicks += 1;
          }
        }
      }
    }

    // Calculate averages and accuracy
    for (const cohort of [analytics.westSide, analytics.eastSide]) {
      cohort.averagePoints = cohort.totalUsers > 0
        ? cohort.totalPoints / cohort.totalUsers
        : 0;
      // Accuracy = correct / graded (graded = picks where result is known)
      cohort.accuracyPercent = cohort.gradedPicks > 0
        ? (cohort.correctPicks / cohort.gradedPicks) * 100
        : 0;
    }

    return NextResponse.json({
      analytics,
      lockedMatchesCount,
      finishedMatchesCount
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
