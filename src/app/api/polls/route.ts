import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// Get active polls the user hasn't voted on yet
export async function GET(request: Request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId as string;

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

    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ polls: activePolls, teams });
  } catch (error) {
    console.error('Failed to fetch polls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Vote on a poll
export async function POST(request: Request) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.payload.userId as string;
    const body = await request.json();
    const { pollId, teamId } = body;

    if (!pollId || !teamId) {
      return NextResponse.json({ error: 'pollId and teamId are required' }, { status: 400 });
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
        teamId,
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
