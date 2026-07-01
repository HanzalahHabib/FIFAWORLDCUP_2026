import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/admin/update-match — fetch all synced matches for admin display
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const matches = await prisma.match.findMany({
      where: { apiFootballId: { not: null } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffTimeUTC: 'asc' },
    });

    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/update-match — manually override match status/scores
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { matchNumber, status, homeScore, awayScore, kickoffTimeUTC } = await request.json();

    if (!matchNumber || !status) {
      return NextResponse.json({ error: 'matchNumber and status are required' }, { status: 400 });
    }

    const validStatuses = ['SCHEDULED', 'LIVE', 'FINISHED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const existing = await prisma.match.findFirst({
      where: { apiFootballId: Number(matchNumber) },
      include: { homeTeam: true, awayTeam: true },
    });

    if (!existing) {
      return NextResponse.json({ error: `No match found with match number ${matchNumber}` }, { status: 404 });
    }

    const updateData: any = { status };
    if (homeScore !== undefined && homeScore !== '') updateData.homeScore = Number(homeScore);
    if (awayScore !== undefined && awayScore !== '') updateData.awayScore = Number(awayScore);
    if (kickoffTimeUTC) updateData.kickoffTimeUTC = new Date(kickoffTimeUTC);

    const updated = await (prisma.match.update as any)({
      where: { id: existing.id },
      data: updateData,
      include: { homeTeam: true, awayTeam: true },
    });

    const homeName = updated.homeTeam?.name || updated.homeTeamLabel || '?';
    const awayName = updated.awayTeam?.name || updated.awayTeamLabel || '?';

    return NextResponse.json({
      message: `Match #${matchNumber} (${homeName} vs ${awayName}) updated to ${status}${homeScore !== undefined ? ` — Score: ${homeScore}-${awayScore}` : ''}`,
      match: updated,
    });
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
  }
}
