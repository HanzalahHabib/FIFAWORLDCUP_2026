import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: { picks: true }
    });

    const finishedMatchesCount = await prisma.match.count({
      where: { status: 'FINISHED' }
    });

    // Fetch finished matches to compute true prediction accuracy
    const finishedMatches = await prisma.match.findMany({
      where: { status: 'FINISHED' }
    });

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

    const analytics = {
      westSide: { totalUsers: 0, totalPoints: 0, totalPicks: 0, correctPicks: 0, averagePoints: 0, accuracyPercent: 0 },
      eastSide: { totalUsers: 0, totalPoints: 0, totalPicks: 0, correctPicks: 0, averagePoints: 0, accuracyPercent: 0 }
    };

    for (const user of users) {
      // Map cohort name: 'West Side' or 'US Team' goes to westSide, others to eastSide
      const cohort = (user.cohort === 'West Side' || user.cohort === 'US Team') ? analytics.westSide : analytics.eastSide;
      
      cohort.totalUsers += 1;
      cohort.totalPoints += user.points;
      
      // Calculate true match prediction correctness
      for (const pick of user.picks) {
        if (actualResults.has(pick.matchId)) {
          cohort.totalPicks += 1;
          if (pick.prediction === actualResults.get(pick.matchId)) {
            cohort.correctPicks += 1;
          }
        }
      }
    }

    // Calculate Averages and Accuracy
    for (const cohort of [analytics.westSide, analytics.eastSide]) {
      cohort.averagePoints = cohort.totalUsers > 0 ? (cohort.totalPoints / cohort.totalUsers) : 0;
      cohort.accuracyPercent = cohort.totalPicks > 0 ? (cohort.correctPicks / cohort.totalPicks) * 100 : 0;
    }

    return NextResponse.json({ analytics, finishedMatchesCount });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
