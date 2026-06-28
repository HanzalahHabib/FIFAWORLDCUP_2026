import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use raw SQL to get users with picks including homeTeamLabel/awayTeamLabel for knockout matches
    const users = await prisma.user.findMany({
      select: { 
        id: true, 
        name: true, 
        email: true, 
        points: true, 
        role: true,
        firstPlaceId: true,
        secondPlaceId: true,
        thirdPlaceId: true,
        fourthPlaceId: true,
        unbeatenTeamId: true,
        noWinTeamId: true,
        picks: {
          include: {
            match: {
              select: {
                id: true,
                kickoffTimeUTC: true,
                status: true,
                homeScore: true,
                awayScore: true,
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } },
              }
            }
          }
        }
      },
      orderBy: { points: 'desc' }
    });

    // Enrich picks with homeTeamLabel/awayTeamLabel/round from raw SQL (bypasses stale Prisma client)
    const matchIds = [...new Set(users.flatMap(u => u.picks.map((p: any) => p.matchId)))];
    let labelMap: Record<string, { homeTeamLabel: string | null; awayTeamLabel: string | null; round: string }> = {};
    if (matchIds.length > 0) {
      const placeholders = matchIds.map((_: string, i: number) => `$${i + 1}`).join(', ');
      const labelRows = await prisma.$queryRawUnsafe(
        `SELECT id, "homeTeamLabel", "awayTeamLabel", round FROM "Match" WHERE id IN (${placeholders})`,
        ...matchIds
      ) as any[];
      for (const row of labelRows) {
        labelMap[row.id] = { homeTeamLabel: row.homeTeamLabel, awayTeamLabel: row.awayTeamLabel, round: row.round };
      }
    }

    // Merge label data into picks
    const enrichedUsers = users.map(u => ({
      ...u,
      picks: u.picks.map((p: any) => ({
        ...p,
        match: p.match ? {
          ...p.match,
          homeTeamLabel: labelMap[p.matchId]?.homeTeamLabel ?? null,
          awayTeamLabel: labelMap[p.matchId]?.awayTeamLabel ?? null,
          round: labelMap[p.matchId]?.round ?? 'group-stage',
        } : null,
      }))
    }));
    
    return NextResponse.json(enrichedUsers);

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, points } = await request.json();
    
    if (typeof points !== 'number') {
        return NextResponse.json({ error: 'Points must be a number' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { points }
    });

    return NextResponse.json({ message: 'Points updated successfully', user });
  } catch (error) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
