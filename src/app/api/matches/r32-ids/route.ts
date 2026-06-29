import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const KNOCKOUT_KICKOFFS: Record<number, string> = {
  73: '2026-06-28T19:00:00Z',
  74: '2026-06-29T20:30:00Z',
  75: '2026-06-30T01:00:00Z',
  76: '2026-06-29T17:00:00Z',
  77: '2026-06-30T21:00:00Z',
  78: '2026-06-30T17:00:00Z',
  79: '2026-07-01T01:00:00Z',
  80: '2026-07-01T16:00:00Z',
  81: '2026-07-02T00:00:00Z',
  82: '2026-07-01T20:00:00Z',
  83: '2026-07-02T23:00:00Z',
  84: '2026-07-02T19:00:00Z',
  85: '2026-07-03T03:00:00Z',
  86: '2026-07-03T22:00:00Z',
  87: '2026-07-04T01:30:00Z',
  88: '2026-07-03T18:00:00Z',
  89: '2026-07-04T21:00:00Z',
  90: '2026-07-04T17:00:00Z',
  91: '2026-07-05T20:00:00Z',
  92: '2026-07-06T00:00:00Z',
  93: '2026-07-06T19:00:00Z',
  94: '2026-07-07T00:00:00Z',
  95: '2026-07-07T16:00:00Z',
  96: '2026-07-07T20:00:00Z',
  97: '2026-07-09T20:00:00Z',
  98: '2026-07-10T19:00:00Z',
  99: '2026-07-11T21:00:00Z',
  100: '2026-07-12T01:00:00Z',
  101: '2026-07-14T19:00:00Z',
  102: '2026-07-15T19:00:00Z',
  103: '2026-07-18T21:00:00Z',
  104: '2026-07-19T19:00:00Z'
};

export async function GET() {
  try {
    // 1. Clean up legacy match numbers (2026100+) in database if they exist
    const legacyMatches = await prisma.match.findMany({
      where: {
        apiFootballId: {
          gte: 2026100,
          lte: 2026131,
        }
      }
    });

    if (legacyMatches.length > 0) {
      console.log(`Found ${legacyMatches.length} legacy matches. Migrating to official IDs...`);
      for (const lm of legacyMatches) {
        const index = lm.apiFootballId! - 2026100;
        const correctId = 73 + index;
        const correctKickoff = KNOCKOUT_KICKOFFS[correctId];
        await prisma.match.update({
          where: { id: lm.id },
          data: {
            apiFootballId: correctId,
            kickoffTimeUTC: new Date(correctKickoff),
            round: correctId <= 88 ? 'round-of-32' : lm.round,
          }
        });
      }
    }

    // 2. Align kickoffTimeUTC for all knockout matches (73-104) to make sure they match the official schedule
    for (const [idStr, kickoffStr] of Object.entries(KNOCKOUT_KICKOFFS)) {
      const matchNum = Number(idStr);
      const correctKickoff = new Date(kickoffStr);
      const match = await prisma.match.findUnique({
        where: { apiFootballId: matchNum }
      });
      if (match && match.kickoffTimeUTC.getTime() !== correctKickoff.getTime()) {
        await prisma.match.update({
          where: { id: match.id },
          data: { kickoffTimeUTC: correctKickoff }
        });
      }
    }

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
