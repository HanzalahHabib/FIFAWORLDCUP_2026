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

    const { type } = await request.json(); // type can be 'CHAMPION', 'UNBEATEN', 'NOWIN'
    
    const settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 404 });

    const users = await prisma.user.findMany();
    let updatedUsers = 0;

    for (const user of users) {
      let addPoints = false;

      if (type === 'CHAMPION' && settings.actualChampionId && user.firstPlaceId === settings.actualChampionId) {
        addPoints = true;
      }
      if (type === 'UNBEATEN' && settings.actualUnbeatenTeamId && user.unbeatenTeamId === settings.actualUnbeatenTeamId) {
        addPoints = true;
      }
      if (type === 'NOWIN' && settings.actualNoWinTeamId && user.noWinTeamId === settings.actualNoWinTeamId) {
        addPoints = true;
      }

      if (addPoints) {
        await prisma.user.update({
          where: { id: user.id },
          data: { points: { increment: 5 } } // Assume 5 points for a major bonus poll
        });
        updatedUsers++;
      }
    }

    return NextResponse.json({ message: `Successfully awarded 5 points to ${updatedUsers} users for ${type}.`, updatedUsers });
  } catch (error) {
    console.error('Resolve Polls Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
