import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all matches (sorted chronologically), including team names
    const matches = await prisma.match.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: { kickoffTimeUTC: 'asc' }
    });

    // Build actual result map for finished matches (with valid scores)
    const actualResults = new Map<string, string>(); // matchId -> 'HOME'|'AWAY'|'DRAW'
    for (const m of matches) {
      if (m.status === 'FINISHED' && m.homeScore !== null && m.awayScore !== null) {
        if (m.homeScore > m.awayScore) actualResults.set(m.id, 'HOME');
        else if (m.awayScore > m.homeScore) actualResults.set(m.id, 'AWAY');
        else actualResults.set(m.id, 'DRAW');
      }
    }

    // Fetch all users with their picks (ordered by name for readability)
    const users = await prisma.user.findMany({
      include: {
        picks: true
      },
      orderBy: { name: 'asc' }
    });

    // Build a quick-lookup: userId -> matchId -> prediction
    const pickMap = new Map<string, Map<string, string>>();
    for (const user of users) {
      const byMatch = new Map<string, string>();
      for (const pick of user.picks) {
        byMatch.set(pick.matchId, pick.prediction);
      }
      pickMap.set(user.id, byMatch);
    }

    // Helper: convert a raw prediction ('HOME'|'AWAY'|'DRAW') to the team name for readability
    function predictionLabel(prediction: string, match: typeof matches[0]): string {
      if (prediction === 'HOME') return match.homeTeam?.name ?? 'HOME';
      if (prediction === 'AWAY') return match.awayTeam?.name ?? 'AWAY';
      return 'DRAW';
    }

    // ----- Build the CSV -----
    // Section 1: MATCH PICKS MATRIX
    // Columns: Match | Date | Status | Result | [Member 1 Pick] | [Member 1 Result] | [Member 2 Pick] | ...
    // We interleave Pick + Correct? per member so it's self-contained per column pair.

    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;

    const lines: string[] = [];

    // --- HEADER ---
    lines.push('FIFA WORLD CUP 2026 - PICKS EXPORT');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // --- SECTION 1: MATCH PICKS MATRIX ---
    lines.push('=== MATCH PICKS (each member has two columns: their pick + whether it was correct) ===');
    lines.push('');

    // Build header row
    const headerParts = ['Match', 'Date (UTC)', 'Match Status', 'Actual Result'];
    for (const user of users) {
      const safeUserName = user.name.replace(/"/g, '""');
      headerParts.push(`${safeUserName} - Pick`);
      headerParts.push(`${safeUserName} - Correct?`);
    }
    lines.push(headerParts.map(escapeCell).join(','));

    // One row per match
    for (const match of matches) {
      const matchLabel = `${match.homeTeam?.name ?? 'TBD'} vs ${match.awayTeam?.name ?? 'TBD'}`;
      const dateLabel = match.kickoffTimeUTC.toISOString().replace('T', ' ').slice(0, 16);
      const statusLabel = match.status; // SCHEDULED | IN_PLAY | FINISHED
      const actualResult = actualResults.get(match.id);
      const actualResultLabel = actualResult
        ? predictionLabel(actualResult, match)
        : (match.status === 'FINISHED' ? 'N/A (no score)' : 'Pending');

      const rowParts = [matchLabel, dateLabel, statusLabel, actualResultLabel];

      for (const user of users) {
        const userPicks = pickMap.get(user.id);
        const prediction = userPicks?.get(match.id);

        if (!prediction) {
          rowParts.push('NO PICK');
          rowParts.push('-');
        } else {
          const pickLabel = predictionLabel(prediction, match);
          rowParts.push(pickLabel);

          if (actualResult) {
            const isCorrect = prediction === actualResult;
            rowParts.push(isCorrect ? 'CORRECT' : 'WRONG');
          } else {
            rowParts.push('Pending');
          }
        }
      }

      lines.push(rowParts.map(escapeCell).join(','));
    }

    lines.push('');

    // --- SECTION 2: MEMBER SUMMARY ---
    lines.push('=== MEMBER SUMMARY ===');
    lines.push('');
    lines.push(['Member Name', 'Cohort', 'Email', 'Correct Picks', 'Total Picks on Finished Matches', 'Accuracy %', 'Total Points (incl. bonuses)'].map(escapeCell).join(','));

    for (const user of users) {
      let correctCount = 0;
      let totalFinishedPicks = 0;
      const userPicks = pickMap.get(user.id) ?? new Map<string, string>();

      for (const [matchId, actualResult] of actualResults) {
        const prediction = userPicks.get(matchId);
        if (prediction) {
          totalFinishedPicks++;
          if (prediction === actualResult) correctCount++;
        }
      }

      const accuracy = totalFinishedPicks > 0
        ? ((correctCount / totalFinishedPicks) * 100).toFixed(1) + '%'
        : 'N/A';

      lines.push([
        user.name,
        user.cohort,
        user.email,
        String(correctCount),
        String(totalFinishedPicks),
        accuracy,
        String(user.points)
      ].map(escapeCell).join(','));
    }

    lines.push('');

    // --- SECTION 3: LEGEND ---
    lines.push('=== LEGEND ===');
    lines.push('"CORRECT","Pick matched the actual result (+1 point)"');
    lines.push('"WRONG","Pick did not match the actual result (0 points)"');
    lines.push('"Pending","Match has not finished yet"');
    lines.push('"NO PICK","Member did not submit a pick for this match"');
    lines.push('"-","No result to compare against yet"');
    lines.push('"Total Points includes manual adjustments, poll bonuses, and end-game bonus picks in addition to match picks."');

    const csv = lines.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="wc26_picks_export_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });

  } catch (error) {
    console.error('Export CSV Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
