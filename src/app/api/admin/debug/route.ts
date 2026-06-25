import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { status: 'FINISHED' },
        { homeScore: { not: null } }
      ]
    }
  });
  
  const polls = await prisma.poll.findMany();
  const users = await prisma.user.findMany({ take: 5, orderBy: { points: 'desc' } });
  
  return NextResponse.json({ matches, polls, users });
}
