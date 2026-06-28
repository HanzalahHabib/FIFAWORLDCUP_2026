import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const FIXTURES_URL = 'https://www.thestatsapi.com/world-cup/data/fixtures.json';

interface Fixture {
  matchNumber: number;
  date: string;
  kickoffUtc: string;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  hostCity: string;
}

// Map stage names from the API to our internal round labels
const STAGE_MAP: Record<string, string> = {
  'group-stage': 'group-stage',
  'round-of-32': 'round-of-32',
  'round-of-16': 'round-of-16',
  'quarter-finals': 'quarter-finals',
  'semi-finals': 'semi-finals',
  'third-place': 'third-place',
  'final': 'final',
};

// Detect if a team name is a placeholder (not a real team name)
function isPlaceholder(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes('winner') ||
    lower.includes('loser') ||
    lower.includes('group ') ||
    lower.includes('runners-up') ||
    lower.includes('third place') ||
    lower.includes('third-place')
  );
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate & Verify Admin Role
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Auto-migrate schema changes before performing sync
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "round" TEXT NOT NULL DEFAULT 'group-stage';
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeTeamLabel" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayTeamLabel" TEXT;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Match_round_idx" ON "Match"("round");
      `);
      console.log('Auto-migration ran successfully during match sync');
    } catch (migErr: any) {
      console.warn('Auto-migration warning (columns might exist):', migErr.message);
    }

    // 2. Fetch fixtures from TheStatsAPI
    const response = await fetch(FIXTURES_URL, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch fixtures from data source' }, { status: 502 });
    }

    const data = await response.json();
    const fixtures: Fixture[] = data.fixtures;

    if (!fixtures || fixtures.length === 0) {
      return NextResponse.json({ error: 'No fixtures found in data source' }, { status: 404 });
    }

    // 3. Filter to group-stage matches only (these have real team names)
    const groupStageFixtures = fixtures.filter(f => f.stage === 'group-stage' && f.group);
    const knockoutFixtures = fixtures.filter(f => f.stage !== 'group-stage');

    // 4. Extract unique teams with their groups from group stage
    const teamMap = new Map<string, string>(); // teamName -> group
    for (const fixture of groupStageFixtures) {
      if (fixture.homeTeam && fixture.group) {
        teamMap.set(fixture.homeTeam, fixture.group);
      }
      if (fixture.awayTeam && fixture.group) {
        teamMap.set(fixture.awayTeam, fixture.group);
      }
    }

    // 5. Upsert all teams (create if not exists, update group if changed)
    let teamsCreated = 0;
    let teamsUpdated = 0;
    const teamIdMap = new Map<string, string>(); // teamName -> teamId

    for (const [teamName, group] of teamMap) {
      const existing = await prisma.team.findUnique({ where: { name: teamName } });
      if (existing) {
        if (existing.group !== group) {
          await prisma.team.update({
            where: { id: existing.id },
            data: { group }
          });
          teamsUpdated++;
        }
        teamIdMap.set(teamName, existing.id);
      } else {
        const newTeam = await prisma.team.create({
          data: { name: teamName, group }
        });
        teamIdMap.set(teamName, newTeam.id);
        teamsCreated++;
      }
    }

    // 6. Create/update group-stage matches that don't already exist
    let matchesCreated = 0;
    let matchesSkipped = 0;
    let matchesUpdated = 0;

    for (const fixture of groupStageFixtures) {
      const homeTeamId = teamIdMap.get(fixture.homeTeam);
      const awayTeamId = teamIdMap.get(fixture.awayTeam);

      if (!homeTeamId || !awayTeamId) {
        matchesSkipped++;
        continue;
      }

      const kickoffTimeUTC = new Date(fixture.kickoffUtc);

      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { apiFootballId: fixture.matchNumber },
            { homeTeamId, awayTeamId, kickoffTimeUTC }
          ]
        }
      });

      if (existingMatch) {
        // Update round if missing
        if ((existingMatch as any).round !== 'group-stage') {
          await (prisma.match.update as any)({
            where: { id: existingMatch.id },
            data: { round: 'group-stage' }
          });
          matchesUpdated++;
        } else {
          matchesSkipped++;
        }
        continue;
      }

      await (prisma.match.create as any)({
        data: {
          homeTeamId,
          awayTeamId,
          kickoffTimeUTC,
          status: 'SCHEDULED',
          apiFootballId: fixture.matchNumber,
          round: 'group-stage',
        }
      });
      matchesCreated++;
    }

    // 7. Create/update knockout stage matches
    let knockoutCreated = 0;
    let knockoutSkipped = 0;
    let knockoutUpdated = 0;

    for (const fixture of knockoutFixtures) {
      const round = STAGE_MAP[fixture.stage] || fixture.stage;
      const kickoffTimeUTC = new Date(fixture.kickoffUtc);

      // For knockout matches, teams are placeholders unless we know who won
      const homeLabel = fixture.homeTeam;
      const awayLabel = fixture.awayTeam;
      const homeIsReal = !isPlaceholder(homeLabel);
      const awayIsReal = !isPlaceholder(awayLabel);

      const homeTeamId = homeIsReal ? (teamIdMap.get(homeLabel) || null) : null;
      const awayTeamId = awayIsReal ? (teamIdMap.get(awayLabel) || null) : null;

      // Check if knockout match already exists
      const existingMatch = await prisma.match.findFirst({
        where: { apiFootballId: fixture.matchNumber }
      });

      if (existingMatch) {
        // Update with labels if they've changed or are missing
        const updates: Record<string, any> = {};
        const existing = existingMatch as any;
        if (existing.round !== round) updates.round = round;
        if (existing.homeTeamLabel !== homeLabel) updates.homeTeamLabel = homeLabel;
        if (existing.awayTeamLabel !== awayLabel) updates.awayTeamLabel = awayLabel;
        // If teams are now known (real), update the IDs
        if (homeTeamId && !existing.homeTeamId) updates.homeTeamId = homeTeamId;
        if (awayTeamId && !existing.awayTeamId) updates.awayTeamId = awayTeamId;

        if (Object.keys(updates).length > 0) {
          await (prisma.match.update as any)({
            where: { id: existingMatch.id },
            data: updates,
          });
          knockoutUpdated++;
        } else {
          knockoutSkipped++;
        }
        continue;
      }

      // Create new knockout match
      await (prisma.match.create as any)({
        data: {
          apiFootballId: fixture.matchNumber,
          homeTeamId: homeTeamId || null,
          awayTeamId: awayTeamId || null,
          homeTeamLabel: homeLabel,
          awayTeamLabel: awayLabel,
          kickoffTimeUTC,
          status: 'SCHEDULED',
          round,
        }
      });
      knockoutCreated++;
    }

    // 8. Remove stale group-stage matches that are no longer in the fixtures
    const validMatchNumbers = groupStageFixtures.map(f => f.matchNumber);
    const allValidMatchNumbers = fixtures.map(f => f.matchNumber);
    
    const staleMatches = await prisma.match.findMany({
      where: {
        apiFootballId: { not: null },
        NOT: { apiFootballId: { in: allValidMatchNumbers } }
      },
      select: { id: true }
    });
    const staleIds = staleMatches.map(m => m.id);
    let matchesRemoved = 0;
    if (staleIds.length > 0) {
      await prisma.pick.deleteMany({ where: { matchId: { in: staleIds } } });
      const deleted = await prisma.match.deleteMany({ where: { id: { in: staleIds } } });
      matchesRemoved = deleted.count;
    }

    return NextResponse.json({
      message: `Sync complete! Teams: ${teamsCreated} created, ${teamsUpdated} updated. Group stage: ${matchesCreated} created, ${matchesSkipped} existing. Knockout: ${knockoutCreated} created, ${knockoutUpdated} updated, ${knockoutSkipped} unchanged. Stale removed: ${matchesRemoved}.`,
      teamsCreated,
      teamsUpdated,
      groupStage: { created: matchesCreated, skipped: matchesSkipped, updated: matchesUpdated },
      knockout: { created: knockoutCreated, updated: knockoutUpdated, skipped: knockoutSkipped },
      matchesRemoved,
      totalTeams: teamMap.size,
      totalFixtures: fixtures.length
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
  }
}
