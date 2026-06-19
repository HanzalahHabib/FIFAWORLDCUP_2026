import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper to check admin access
async function checkAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return false;

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') {
    return false;
  }
  return true;
}

// Get all polls for admin dashboard
export async function GET(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const polls = await prisma.poll.findMany({
      include: {
        _count: {
          select: { votes: true },
        },
        resultTeam: true,
        votes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            team: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ polls });
  } catch (error) {
    console.error('Failed to fetch polls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new poll
export async function POST(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { question, options } = body;

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        options: Array.isArray(options) ? options : [],
        isActive: false, // Inactive by default
      },
    });

    return NextResponse.json({ message: 'Poll created successfully', poll });
  } catch (error) {
    console.error('Failed to create poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete a poll
export async function DELETE(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Poll ID is required' }, { status: 400 });
    }

    await prisma.poll.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Failed to delete poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Toggle active status or Resolve poll
export async function PUT(request: Request) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action, isActive, resultTeamId, resultOption } = body;

    if (!id || !action) {
      return NextResponse.json({ error: 'ID and action are required' }, { status: 400 });
    }

    if (action === 'TOGGLE_ACTIVE') {
      const poll = await prisma.poll.update({
        where: { id },
        data: { isActive: !!isActive },
      });
      return NextResponse.json({ message: 'Poll updated successfully', poll });
    }

    if (action === 'RESOLVE') {
      if (!resultTeamId && !resultOption) {
        return NextResponse.json({ error: 'Result Team ID or Custom Option is required to resolve' }, { status: 400 });
      }

      // Mark the poll result
      const poll = await prisma.poll.update({
        where: { id },
        data: { 
          resultTeamId: resultTeamId || null,
          resultOption: resultOption || null,
          isActive: false // Deactivate after resolving
        },
      });

      // Find all correct votes
      let correctVotes = [];
      if (resultTeamId) {
        correctVotes = await prisma.pollVote.findMany({
          where: {
            pollId: id,
            teamId: resultTeamId,
          },
        });
      } else if (resultOption) {
        correctVotes = await prisma.pollVote.findMany({
          where: {
            pollId: id,
            option: resultOption,
          },
        });
      }

      // Award points (e.g., 2 points for correct poll vote)
      const POINTS_AWARD = 2;
      
      const userIdsToReward = correctVotes.map(v => v.userId);

      if (userIdsToReward.length > 0) {
        await prisma.user.updateMany({
          where: {
            id: { in: userIdsToReward }
          },
          data: {
            points: {
              increment: POINTS_AWARD
            }
          }
        });
      }

      return NextResponse.json({ 
        message: `Poll resolved. Awarded ${POINTS_AWARD} points to ${correctVotes.length} users.` 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Failed to update poll:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
