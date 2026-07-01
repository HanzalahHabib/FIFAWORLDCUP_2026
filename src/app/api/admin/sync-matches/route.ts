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

function normalizeTeamName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace('republic', 'rep')
    .replace('unitedstates', 'usa')
    .replace('congodr', 'drcongo')
    .replace('democraticrepublicofcongo', 'drcongo')
    .replace('bosniaherzegovina', 'bosniaherz');
}

function mapSofascoreRound(roundName: string | undefined): string | null {
  if (!roundName) return null;
  const name = roundName.toLowerCase();
  if (name.includes('round of 32') || name.includes('r32')) return 'round-of-32';
  if (name.includes('round of 16') || name.includes('r16')) return 'round-of-16';
  if (name.includes('quarter') || name.includes('qf')) return 'quarter-finals';
  if (name.includes('semi') || name.includes('sf')) return 'semi-finals';
  if (name.includes('third') || name.includes('3rd') || name.includes('playoff')) return 'third-place';
  if (name.includes('final')) return 'final';
  if (name.includes('group')) return 'group-stage';
  return null;
}

function mapSofascoreStatus(statusType: string | undefined): string {
  if (!statusType) return 'SCHEDULED';
  const type = statusType.toLowerCase();
  if (type === 'finished') return 'FINISHED';
  if (type === 'inprogress' || type === 'live' || type === 'halftime') return 'LIVE';
  return 'SCHEDULED';
}

function findMatchingSofascoreEvent(dbMatch: any, sfEvents: any[]) {
  const dbHomeName = normalizeTeamName(dbMatch.homeTeam?.name || dbMatch.homeTeamLabel);
  const dbAwayName = normalizeTeamName(dbMatch.awayTeam?.name || dbMatch.awayTeamLabel);
  const dbKickoff = new Date(dbMatch.kickoffTimeUTC);
  const dbRound = dbMatch.round;

  // 1. Try exact team matches
  const exactMatch = sfEvents.find(event => {
    const sfHome = normalizeTeamName(event.homeTeam?.name);
    const sfAway = normalizeTeamName(event.awayTeam?.name);
    return sfHome === dbHomeName && sfAway === dbAwayName;
  });
  if (exactMatch) return exactMatch;

  // 2. Try match by kickoff time (within 2 hours) and round
  const timeAndRoundMatch = sfEvents.find(event => {
    const sfKickoff = new Date(event.startTimestamp * 1000);
    const diffHours = Math.abs(sfKickoff.getTime() - dbKickoff.getTime()) / (1000 * 60 * 60);
    const sfRound = mapSofascoreRound(event.roundInfo?.name) || mapSofascoreRound(event.tournament?.name);

    if (diffHours <= 2) {
      if (sfRound && dbRound === sfRound) return true;
      if (!sfRound) return true;
    }
    return false;
  });

  return timeAndRoundMatch;
}

async function fetchSofascoreEvents(path: 'last' | 'next'): Promise<any[]> {
  const url = `https://api.sofascore.com/api/v1/unique-tournament/16/season/58210/events/${path}/0`;
  const directHeaders = {
    'authority': 'api.sofascore.com',
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    'origin': 'https://www.sofascore.com',
    'pragma': 'no-cache',
    'referer': 'https://www.sofascore.com/',
    'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    console.log(`Fetching Sofascore events (${path}) directly...`);
    let sfRes = await fetch(url, { headers: directHeaders, cache: 'no-store' });
    
    if (!sfRes.ok) {
      console.warn(`Direct Sofascore fetch (${path}) failed with status: ${sfRes.status}. Trying fallback proxy (corsproxy.io)...`);
      const proxyHeaders = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      sfRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, { headers: proxyHeaders, cache: 'no-store' });
    }

    if (!sfRes.ok) {
      console.warn(`Corsproxy fetch (${path}) failed with status: ${sfRes.status}. Trying fallback proxy (allorigins)...`);
      const proxyHeaders = {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      sfRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { headers: proxyHeaders, cache: 'no-store' });
    }

    if (sfRes.ok) {
      const sfData = await sfRes.json();
      if (sfData && Array.isArray(sfData.events)) {
        console.log(`Successfully fetched ${sfData.events.length} events from Sofascore (${path})!`);
        return sfData.events;
      }
    } else {
      console.error(`All Sofascore fetch attempts failed for (${path}). Status: ${sfRes.status}`);
    }
  } catch (err) {
    console.error(`Exception during Sofascore fetch (${path}):`, err);
  }
  return [];
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

    // 3. Fetch events from Sofascore (both past and future matches)
    let sofascoreEvents: any[] = [];
    try {
      const [lastEvents, nextEvents] = await Promise.all([
        fetchSofascoreEvents('last'),
        fetchSofascoreEvents('next')
      ]);
      sofascoreEvents = [...lastEvents, ...nextEvents];
      console.log(`Combined Sofascore events count: ${sofascoreEvents.length}`);
    } catch (sfErr) {
      console.error('Error fetching from Sofascore:', sfErr);
    }

    // 4. Filter to group-stage matches only (these have real team names)
    const groupStageFixtures = fixtures.filter(f => f.stage === 'group-stage' && f.group);
    const knockoutFixtures = fixtures.filter(f => f.stage !== 'group-stage');

    // 5. Extract unique teams with their groups from group stage
    const teamMap = new Map<string, string>(); // teamName -> group
    for (const fixture of groupStageFixtures) {
      if (fixture.homeTeam && fixture.group) {
        teamMap.set(fixture.homeTeam, fixture.group);
      }
      if (fixture.awayTeam && fixture.group) {
        teamMap.set(fixture.awayTeam, fixture.group);
      }
    }

    // 6. Upsert all teams (create if not exists, update group if changed)
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

    // Fetch all existing teams (including any manually added) for robust lookup
    const allTeams = await prisma.team.findMany();
    const normalizedTeamIdMap = new Map<string, string>();
    for (const team of allTeams) {
      normalizedTeamIdMap.set(normalizeTeamName(team.name), team.id);
    }

    // 7. Create/update group-stage matches that don't already exist (baseline)
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
        const updates: Record<string, any> = {};
        const existing = existingMatch as any;
        if (existing.round !== 'group-stage') updates.round = 'group-stage';

        if (Object.keys(updates).length > 0) {
          await (prisma.match.update as any)({
            where: { id: existingMatch.id },
            data: updates
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

    // 8. Create/update knockout stage matches (baseline)
    let knockoutCreated = 0;
    let knockoutSkipped = 0;
    let knockoutUpdated = 0;

    for (const fixture of knockoutFixtures) {
      const round = STAGE_MAP[fixture.stage] || fixture.stage;
      const kickoffTimeUTC = new Date(fixture.kickoffUtc);

      const homeLabel = fixture.homeTeam;
      const awayLabel = fixture.awayTeam;
      const homeIsReal = !isPlaceholder(homeLabel);
      const awayIsReal = !isPlaceholder(awayLabel);

      const homeTeamId = homeIsReal ? (normalizedTeamIdMap.get(normalizeTeamName(homeLabel)) || null) : null;
      const awayTeamId = awayIsReal ? (normalizedTeamIdMap.get(normalizeTeamName(awayLabel)) || null) : null;

      const existingMatch = await prisma.match.findFirst({
        where: { apiFootballId: fixture.matchNumber }
      });

      if (existingMatch) {
        const updates: Record<string, any> = {};
        const existing = existingMatch as any;
        if (existing.round !== round) updates.round = round;
        if (existing.homeTeamLabel !== homeLabel) updates.homeTeamLabel = homeLabel;
        if (existing.awayTeamLabel !== awayLabel) updates.awayTeamLabel = awayLabel;
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

    // 9. SOFASCORE UPDATE PASS (Update all matches using Sofascore as source of truth)
    let sofascoreUpdates = 0;
    if (sofascoreEvents.length > 0) {
      const dbMatches = await prisma.match.findMany({
        include: {
          homeTeam: true,
          awayTeam: true
        }
      });

      for (const dbMatch of dbMatches) {
        const sfEvent = findMatchingSofascoreEvent(dbMatch, sofascoreEvents);
        if (sfEvent) {
          const status = mapSofascoreStatus(sfEvent.status?.type);
          const homeScore = sfEvent.homeScore?.current ?? sfEvent.homeScore?.display ?? null;
          const awayScore = sfEvent.awayScore?.current ?? sfEvent.awayScore?.display ?? null;
          const kickoffTimeUTC = new Date(sfEvent.startTimestamp * 1000);

          let homeLabel = dbMatch.homeTeamLabel;
          let awayLabel = dbMatch.awayTeamLabel;
          let homeTeamId = dbMatch.homeTeamId;
          let awayTeamId = dbMatch.awayTeamId;

          // If Sofascore event has real resolved names instead of placeholders
          if (sfEvent.homeTeam?.name && !isPlaceholder(sfEvent.homeTeam.name)) {
            homeLabel = sfEvent.homeTeam.name;
            const foundId = normalizedTeamIdMap.get(normalizeTeamName(sfEvent.homeTeam.name));
            if (foundId) homeTeamId = foundId;
          }
          if (sfEvent.awayTeam?.name && !isPlaceholder(sfEvent.awayTeam.name)) {
            awayLabel = sfEvent.awayTeam.name;
            const foundId = normalizedTeamIdMap.get(normalizeTeamName(sfEvent.awayTeam.name));
            if (foundId) awayTeamId = foundId;
          }

          // Build updates
          const updates: Record<string, any> = {};
          if (dbMatch.kickoffTimeUTC.getTime() !== kickoffTimeUTC.getTime()) updates.kickoffTimeUTC = kickoffTimeUTC;
          if (dbMatch.status !== status) updates.status = status;
          if (dbMatch.homeScore !== homeScore) updates.homeScore = homeScore;
          if (dbMatch.awayScore !== awayScore) updates.awayScore = awayScore;
          if (dbMatch.homeTeamLabel !== homeLabel) updates.homeTeamLabel = homeLabel;
          if (dbMatch.awayTeamLabel !== awayLabel) updates.awayTeamLabel = awayLabel;
          if (dbMatch.homeTeamId !== homeTeamId) updates.homeTeamId = homeTeamId;
          if (dbMatch.awayTeamId !== awayTeamId) updates.awayTeamId = awayTeamId;

          if (Object.keys(updates).length > 0) {
            console.log(`[Sofascore Update] Match #${dbMatch.apiFootballId} (${dbMatch.homeTeam?.name || dbMatch.homeTeamLabel} vs ${dbMatch.awayTeam?.name || dbMatch.awayTeamLabel}):`, updates);
            await (prisma.match.update as any)({
              where: { id: dbMatch.id },
              data: updates
            });
            sofascoreUpdates++;
          }
        }
      }
    }

    // 10. Remove stale group-stage matches that are no longer in the fixtures
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
      message: `Sync complete! Teams: ${teamsCreated} created, ${teamsUpdated} updated. Group stage: ${matchesCreated} created, ${matchesSkipped} existing. Knockout: ${knockoutCreated} created, ${knockoutUpdated} updated, ${knockoutSkipped} unchanged. Sofascore updates: ${sofascoreUpdates}. Stale removed: ${matchesRemoved}.`,
      teamsCreated,
      teamsUpdated,
      groupStage: { created: matchesCreated, skipped: matchesSkipped, updated: matchesUpdated },
      knockout: { created: knockoutCreated, updated: knockoutUpdated, skipped: knockoutSkipped },
      sofascoreUpdates,
      matchesRemoved,
      totalTeams: teamMap.size,
      totalFixtures: fixtures.length
    });

  } catch (error) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown') }, { status: 500 });
  }
}
