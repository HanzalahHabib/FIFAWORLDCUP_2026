import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const picks = await prisma.pick.findMany({
      where: { userId: payload.userId },
      select: { matchId: true, prediction: true }
    });

    return NextResponse.json(picks);
  } catch (error) {
    console.error('Fetch Picks Error:', error);
    return NextResponse.json([], { status: 200 });
  }
}

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

    // Reject DRAW for knockout rounds
    const knockoutRounds = ['round-of-32', 'round-of-16', 'quarter-finals', 'semi-finals', 'third-place', 'final'];
    const matchRound = (match as any).round ?? 'group-stage';
    if (prediction === 'DRAW' && knockoutRounds.includes(matchRound)) {
      return NextResponse.json({ error: 'Draw is not allowed in knockout rounds. Pick a winner.' }, { status: 400 });
    }

    // STRICT GUARDRAIL LOGIC: Time-Lock Validation
    // Block if match is not SCHEDULED (admin locked it) OR kickoff time has passed
    const now = new Date();
    if (match.status !== 'SCHEDULED' || now >= match.kickoffTimeUTC) {
      return NextResponse.json({ error: 'Match is locked. Picks are not allowed.' }, { status: 403 });
    }

    // 4. Upsert Pick (Allow changes until kickoff)
    const pick = await prisma.pick.upsert({
      where: {
        userId_matchId: {
          userId: payload.userId,
          matchId: match.id,
        }
      },
      update: {
        prediction,
      },
      create: {
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
