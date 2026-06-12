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

    const analytics = {
      usTeam: { totalUsers: 0, totalPoints: 0, totalPicks: 0, correctPicks: 0, averagePoints: 0, accuracyPercent: 0 },
      pkTeam: { totalUsers: 0, totalPoints: 0, totalPicks: 0, correctPicks: 0, averagePoints: 0, accuracyPercent: 0 }
    };

    for (const user of users) {
      const cohort = user.cohort === 'US Team' ? analytics.usTeam : analytics.pkTeam;
      
      cohort.totalUsers += 1;
      cohort.totalPoints += user.points;
      // We assume user.points = correct picks for now (base scoring)
      cohort.correctPicks += user.points;
      cohort.totalPicks += user.picks.length;
    }

    // Calculate Averages and Accuracy
    for (const cohort of [analytics.usTeam, analytics.pkTeam]) {
      cohort.averagePoints = cohort.totalUsers > 0 ? (cohort.totalPoints / cohort.totalUsers) : 0;
      cohort.accuracyPercent = cohort.totalPicks > 0 ? (cohort.correctPicks / cohort.totalPicks) * 100 : 0;
    }

    return NextResponse.json({ analytics, finishedMatchesCount });

  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
