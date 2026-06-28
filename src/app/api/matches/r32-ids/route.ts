import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch Round of 32 match IDs (apiFootballId 73-88) from DB
    const rows = await prisma.$queryRawUnsafe(`
      SELECT id, "apiFootballId" FROM "Match"
      WHERE "apiFootballId" BETWEEN 73 AND 88
    `) as { id: string; apiFootballId: number }[];

    // Return as { [apiFootballId]: dbId }
    const map: Record<number, string> = {};
    for (const row of rows) {
      if (row.apiFootballId) {
        map[row.apiFootballId] = row.id;
      }
    }

    return NextResponse.json(map);
  } catch (error) {
    // DB might not have the data yet - return empty map
    return NextResponse.json({});
  }
}
