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
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        firstPlaceId: true,
        unbeatenTeamId: true,
        noWinTeamId: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch settings for deadline
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    const deadline = settings?.championPickDeadline || null;

    // Fetch all teams
    const teams = await prisma.team.findMany({
      select: { id: true, name: true, group: true, flagUrl: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      predictions: {
        firstPlaceId: user.firstPlaceId,
        unbeatenTeamId: user.unbeatenTeamId,
        noWinTeamId: user.noWinTeamId,
      },
      deadline,
      teams,
    });
  } catch (error) {
    console.error('Fetch Bonus Picks Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { firstPlaceId, unbeatenTeamId, noWinTeamId } = await request.json();

    if (!firstPlaceId || !unbeatenTeamId || !noWinTeamId) {
      return NextResponse.json({ error: 'Missing predictions' }, { status: 400 });
    }

    // Verify deadline has not passed
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (settings?.championPickDeadline) {
      const deadline = new Date(settings.championPickDeadline);
      if (new Date() >= deadline) {
        return NextResponse.json({ error: 'The deadline for submitting tournament predictions has passed.' }, { status: 403 });
      }
    }

    // Check if already set
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.firstPlaceId || user.unbeatenTeamId || user.noWinTeamId) {
      return NextResponse.json({ error: 'Tournament predictions are locked and can only be set once.' }, { status: 403 });
    }

    // Validate that the provided team IDs exist
    const teamIds = [firstPlaceId, unbeatenTeamId, noWinTeamId];
    const teamsExist = await prisma.team.findMany({
      where: { id: { in: teamIds } },
    });

    if (teamsExist.length !== 3) {
      // If the user picked the same team for multiple fields, checking distinct count
      const uniqueIds = Array.from(new Set(teamIds));
      if (teamsExist.length !== uniqueIds.length) {
        return NextResponse.json({ error: 'One or more selected teams are invalid.' }, { status: 400 });
      }
    }

    // Update user picks
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        firstPlaceId,
        unbeatenTeamId,
        noWinTeamId,
      },
    });

    return NextResponse.json({
      message: 'Predictions locked in successfully!',
      predictions: {
        firstPlaceId: updatedUser.firstPlaceId,
        unbeatenTeamId: updatedUser.unbeatenTeamId,
        noWinTeamId: updatedUser.noWinTeamId,
      },
    });
  } catch (error) {
    console.error('Submit Bonus Picks Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
