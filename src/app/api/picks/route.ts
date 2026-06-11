import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // 1. Authenticate User
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse Request
    const body = await request.json();
    const { matchId, prediction } = body;

    if (!matchId || !prediction) {
      return NextResponse.json({ error: 'Missing matchId or prediction' }, { status: 400 });
    }

    if (!['HOME', 'AWAY', 'DRAW'].includes(prediction)) {
      return NextResponse.json({ error: 'Invalid prediction' }, { status: 400 });
    }

    // 3. Fetch Match & Validate
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // STRICT GUARDRAIL LOGIC: Time-Lock Validation
    const now = new Date();
    if (now >= match.kickoffTimeUTC) {
      return NextResponse.json({ error: 'Match has already kicked off. Picks are locked.' }, { status: 403 });
    }

    // 4. Prevent Modification / Re-submission
    const existingPick = await prisma.pick.findUnique({
      where: {
        userId_matchId: {
          userId: payload.userId,
          matchId: match.id,
        }
      }
    });

    if (existingPick) {
      return NextResponse.json({ error: 'You have already submitted a pick for this match. Modifications are not allowed.' }, { status: 403 });
    }

    // 5. Save Pick
    const pick = await prisma.pick.create({
      data: {
        userId: payload.userId,
        matchId: match.id,
        prediction,
      }
    });

    return NextResponse.json({ message: 'Pick submitted successfully', pick }, { status: 201 });

  } catch (error) {
    console.error('Pick Submission Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
