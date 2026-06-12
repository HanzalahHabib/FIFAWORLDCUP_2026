import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: 'global' } });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    
    // Convert championPickDeadline to Date if it exists
    if (data.championPickDeadline) {
        data.championPickDeadline = new Date(data.championPickDeadline);
    } else if (data.championPickDeadline === null) {
        data.championPickDeadline = null;
    }

    const settings = await prisma.settings.upsert({
      where: { id: 'global' },
      update: data,
      create: {
        id: 'global',
        ...data,
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Settings Update Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
