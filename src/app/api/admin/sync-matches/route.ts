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

    // 4. Extract unique teams with their groups
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

    // 6. Create matches that don't already exist
    let matchesCreated = 0;
    let matchesSkipped = 0;

    for (const fixture of groupStageFixtures) {
      const homeTeamId = teamIdMap.get(fixture.homeTeam);
      const awayTeamId = teamIdMap.get(fixture.awayTeam);

      if (!homeTeamId || !awayTeamId) {
        matchesSkipped++;
        continue;
      }

      const kickoffTimeUTC = new Date(fixture.kickoffUtc);

      // Check if this match already exists (by apiFootballId or by same teams + kickoff)
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { apiFootballId: fixture.matchNumber },
            {
              homeTeamId,
              awayTeamId,
              kickoffTimeUTC
            }
          ]
        }
      });

      if (existingMatch) {
        matchesSkipped++;
        continue;
      }

      await prisma.match.create({
        data: {
          homeTeamId,
          awayTeamId,
          kickoffTimeUTC,
          status: 'SCHEDULED',
          apiFootballId: fixture.matchNumber
        }
      });
      matchesCreated++;
    }

    // 7. Remove stale automatic matches that are no longer in the fixtures
    const validMatchNumbers = groupStageFixtures.map(f => f.matchNumber);
    const staleMatches = await prisma.match.findMany({
      where: {
        apiFootballId: { not: null },
        NOT: { apiFootballId: { in: validMatchNumbers } }
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
      message: `Sync complete! Teams: ${teamsCreated} created, ${teamsUpdated} updated. Matches: ${matchesCreated} created, ${matchesSkipped} already existed, ${matchesRemoved} stale removed.`,
      teamsCreated,
      teamsUpdated,
      matchesCreated,
      matchesSkipped,
      matchesRemoved,
      totalTeams: teamMap.size,
      totalGroupStageFixtures: groupStageFixtures.length
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
  }
}
