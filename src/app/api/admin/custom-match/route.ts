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

    const { homeTeamId, awayTeamId, kickoffTimeUTC } = await request.json();

    if (!homeTeamId || !awayTeamId || !kickoffTimeUTC) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const match = await prisma.match.create({
      data: {
        homeTeamId,
        awayTeamId,
        kickoffTimeUTC: new Date(kickoffTimeUTC),
        status: 'SCHEDULED'
      }
    });

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Match ID required' }, { status: 400 });

    // Delete associated picks first
    await prisma.pick.deleteMany({ where: { matchId: id } });
    await prisma.match.delete({ where: { id } });

    return NextResponse.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Delete Match Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
