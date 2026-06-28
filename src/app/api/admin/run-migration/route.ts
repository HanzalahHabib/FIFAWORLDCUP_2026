import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

async function performMigrationAndGeneration() {
  const results: string[] = [];

  // 1. Run ALTER TABLE SQL migrations
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "round" TEXT NOT NULL DEFAULT 'group-stage';
    `);
    results.push('✓ Added round column');
  } catch (e: any) {
    results.push(`round column: ${e.message}`);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeTeamLabel" TEXT;
    `);
    results.push('✓ Added homeTeamLabel column');
  } catch (e: any) {
    results.push(`homeTeamLabel column: ${e.message}`);
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayTeamLabel" TEXT;
    `);
    results.push('✓ Added awayTeamLabel column');
  } catch (e: any) {
    results.push(`awayTeamLabel column: ${e.message}`);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Match_round_idx" ON "Match"("round");
    `);
    results.push('✓ Added index on round');
  } catch (e: any) {
    results.push(`Index: ${e.message}`);
  }

  // 2. Run prisma generate to update node_modules Prisma Client
  try {
    results.push('Running "npx prisma generate"...');
    const stdout = execSync('npx prisma generate', { encoding: 'utf-8' });
    results.push('✓ Prisma Generate Output: ' + stdout);
  } catch (genErr: any) {
    results.push(`⨯ Prisma Generate Error: ${genErr.message}`);
    if (genErr.stdout) results.push('Stdout: ' + genErr.stdout);
    if (genErr.stderr) results.push('Stderr: ' + genErr.stderr);
  }

  return results;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Bypass check if secret is correct
    if (secret !== 'migrate') {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth_token')?.value;
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const payload = await verifyToken(token);
      if (!payload || payload.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const results = await performMigrationAndGeneration();
    return NextResponse.json({ message: 'Migration and client generation attempt complete', results });
  } catch (error: any) {
    console.error('Migration/Generation Error:', error);
    return NextResponse.json({ error: 'Failed: ' + error.message }, { status: 500 });
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

    const results = await performMigrationAndGeneration();
    return NextResponse.json({ message: 'Migration and client generation attempt complete', results });
  } catch (error: any) {
    console.error('Migration/Generation Error:', error);
    return NextResponse.json({ error: 'Failed: ' + error.message }, { status: 500 });
  }
}
