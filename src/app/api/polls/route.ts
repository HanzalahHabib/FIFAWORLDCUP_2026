import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Get active polls the user hasn't voted on yet
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId as string;

    // Fetch active polls that this user has not voted on
    const activePolls = await prisma.poll.findMany({
      where: {
        isActive: true,
        votes: {
          none: {
            userId: userId,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // If there are no active polls, return immediately to save a DB query
    if (activePolls.length === 0) {
      return NextResponse.json({ polls: [], teams: [] });
    }

    // Check if any active poll is team-based (options array is empty)
    const hasTeamPoll = activePolls.some(p => !p.options || p.options.length === 0);
    
    let teams: any[] = [];
    if (hasTeamPoll) {
      teams = await prisma.team.findMany({
        orderBy: { name: 'asc' },
      });
    }

    return NextResponse.json({ polls: activePolls, teams });
  } catch (error) {
    console.error('Failed to fetch polls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Vote on a poll
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = payload.userId as string;
    const body = await request.json();
    const { pollId, teamId, option } = body;

    if (!pollId || (!teamId && !option)) {
      return NextResponse.json({ error: 'pollId and either teamId or option are required' }, { status: 400 });
    }

    // Check if the poll is active
    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll || !poll.isActive) {
      return NextResponse.json({ error: 'Poll is not active' }, { status: 400 });
    }

    // Record the vote
    await prisma.pollVote.create({
      data: {
        pollId,
        userId,
        teamId: teamId || null,
        option: option || null,
      },
    });

    return NextResponse.json({ message: 'Vote recorded successfully' });
  } catch (error: any) {
    console.error('Failed to vote on poll:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'You have already voted on this poll' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
