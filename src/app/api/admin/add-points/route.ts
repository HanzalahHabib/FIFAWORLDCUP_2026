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

    const result = await prisma.user.updateMany({
      data: {
        points: {
          increment: 1
        },
        manualPoints: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      message: `Successfully gave 1 point to ${result.count} users.`,
      updatedUsers: result.count
    });

  } catch (error) {
    console.error('Add Points Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
