import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch Round of 32 match details (apiFootballId 73-88) from DB
    const rows = await prisma.$queryRawUnsafe(`
      SELECT id, "apiFootballId", "kickoffTimeUTC", status, "homeScore", "awayScore"
      FROM "Match"
      WHERE "apiFootballId" BETWEEN 73 AND 88
    `) as any[];

    // Return as { ids: { [apiFootballId]: dbId }, matches: [...] }
    const ids: Record<number, string> = {};
    const matches: any[] = [];

    for (const row of rows) {
      if (row.apiFootballId) {
        ids[row.apiFootballId] = row.id;
      }
      matches.push({
        id: row.id,
        apiFootballId: row.apiFootballId,
        kickoffTimeUTC: row.kickoffTimeUTC,
        status: row.status,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
      });
    }

    return NextResponse.json({ ids, matches });
  } catch (error) {
    // DB might not have the data yet - return empty structures
    return NextResponse.json({ ids: {}, matches: [] });
  }
}
