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

    const customMatches = await prisma.match.findMany({
      where: { apiFootballId: null },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { kickoffTimeUTC: 'asc' },
    });

    const automaticMatches = await prisma.match.findMany({
      where: { apiFootballId: { not: null } },
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: { kickoffTimeUTC: 'asc' },
    });

    return NextResponse.json({ customMatches, automaticMatches });
  } catch (error) {
    console.error('Fetch Custom Matches Error:', error);
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

    const { homeTeamId, awayTeamId, kickoffTimeUTC, round, matchNumber } = await request.json();

    if (!homeTeamId || !awayTeamId || !kickoffTimeUTC) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // If a match number is provided, validate it is unique
    if (matchNumber !== undefined && matchNumber !== null && matchNumber !== '') {
      const existingByNumber = await prisma.match.findUnique({
        where: { apiFootballId: Number(matchNumber) }
      });
      if (existingByNumber) {
        return NextResponse.json({ error: `Match number ${matchNumber} is already taken.` }, { status: 400 });
      }
    }

    const createData: any = {
      homeTeamId,
      awayTeamId,
      kickoffTimeUTC: new Date(kickoffTimeUTC),
      status: 'SCHEDULED',
      round: round || 'group-stage',
    };

    if (matchNumber !== undefined && matchNumber !== null && matchNumber !== '') {
      createData.apiFootballId = Number(matchNumber);
    }

    const match = await (prisma.match.create as any)({ data: createData });

    return NextResponse.json({ message: 'Match created successfully', match });
  } catch (error) {
    console.error('Create Match Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Support bulk delete via JSON body, or single delete via query param
    const { searchParams } = new URL(request.url);
    const singleId = searchParams.get('id');

    let idsToDelete: string[] = [];

    if (singleId) {
      idsToDelete = [singleId];
    } else {
      try {
        const body = await request.json();
        if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
          idsToDelete = body.ids;
        }
      } catch {
        // No body provided
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ error: 'Match ID(s) required' }, { status: 400 });
    }

    // Delete associated picks first, then matches
    await prisma.pick.deleteMany({ where: { matchId: { in: idsToDelete } } });
    await prisma.match.deleteMany({ where: { id: { in: idsToDelete } } });

    return NextResponse.json({ message: `${idsToDelete.length} match(es) deleted successfully`, deleted: idsToDelete.length });
  } catch (error) {
    console.error('Delete Match Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
