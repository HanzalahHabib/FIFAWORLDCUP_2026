import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Calendar } from 'lucide-react';
import MatchCard from '@/components/MatchCard';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ round?: string }>;
}

// Raw-SQL based match fetcher that bypasses Prisma type validation
async function fetchMatchesRaw(userId: string | null, round: string) {
  const roundMap: Record<string, string[]> = {
    group: ['group-stage'],
    r16:   ['round-of-16'],
    qf:    ['quarter-finals'],
    sf:    ['semi-finals', 'third-place'],
    final: ['final'],
  };

  const rounds = roundMap[round] || ['group-stage'];
  const placeholders = rounds.map((_: string, i: number) => `$${i + 1}`).join(', ');

  const sql = `SELECT m.*,
    ht.id as "homeTeam_id", ht.name as "homeTeam_name", ht.group as "homeTeam_group",
    at.id as "awayTeam_id", at.name as "awayTeam_name", at.group as "awayTeam_group"
    FROM "Match" m
    LEFT JOIN "Team" ht ON m."homeTeamId" = ht.id
    LEFT JOIN "Team" at ON m."awayTeamId" = at.id
    WHERE m.round IN (${placeholders})
    ORDER BY m."kickoffTimeUTC" ASC`;

  const rows = await prisma.$queryRawUnsafe(sql, ...rounds) as any[];

  // Fetch user picks
  let userPickMap: Record<string, string> = {};
  if (userId) {
    const pickRows = await prisma.$queryRawUnsafe(
      `SELECT "matchId", prediction FROM "Pick" WHERE "userId" = $1`,
      userId
    ) as any[];
    for (const p of pickRows) {
      userPickMap[p.matchId] = p.prediction;
    }
  }

  return rows.map((r: any) => ({
    id: r.id,
    apiFootballId: r.apiFootballId,
    kickoffTimeUTC: r.kickoffTimeUTC instanceof Date ? r.kickoffTimeUTC.toISOString() : r.kickoffTimeUTC,
    status: r.status,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    round: r.round ?? 'group-stage',
    homeTeamLabel: r.homeTeamLabel ?? null,
    awayTeamLabel: r.awayTeamLabel ?? null,
    homeTeam: r.homeTeam_id ? { id: r.homeTeam_id, name: r.homeTeam_name, group: r.homeTeam_group } : null,
    awayTeam: r.awayTeam_id ? { id: r.awayTeam_id, name: r.awayTeam_name, group: r.awayTeam_group } : null,
    picks: userId && userPickMap[r.id] ? [{ prediction: userPickMap[r.id] }] : [],
  }));
}

export default async function MatchesPage({ searchParams }: PageProps) {
  // Auto-migrate columns silently
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "round" TEXT NOT NULL DEFAULT 'group-stage'`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeTeamLabel" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayTeamLabel" TEXT`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Match_round_idx" ON "Match"("round")`);
  } catch (_) {}

  const { round = 'group' } = await searchParams;

  // Redirect round=r32 (and legacy "upcoming") to the bracket page
  if (round === 'r32' || round === 'upcoming') {
    redirect('/bracket');
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let userId: string | null = null;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) userId = payload.userId as string;
  }

  const matches = await fetchMatchesRaw(userId, round);

  const tabs = [
    { id: 'group', label: '⚽ Group Stage' },
    { id: 'r16',   label: 'Round of 16' },
    { id: 'qf',    label: 'Quarter-finals' },
    { id: 'sf',    label: 'Semi-finals' },
    { id: 'final', label: '🏆 Final' },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex justify-center items-center gap-3">
          <Calendar className="text-indigo-400 w-10 h-10" /> Match Center
        </h1>
        <p className="text-slate-400">
          Lock in your predictions before kickoff. {' '}
          <Link href="/bracket" className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
            ⚔️ Round of 32 Bracket →
          </Link>
        </p>
      </div>

      {/* Round Tabs */}
      <div className="flex flex-wrap gap-2 justify-center border-b border-white/10 pb-4">
        {tabs.map(tab => (
          <Link
            key={tab.id}
            href={`/matches?round=${tab.id}`}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              round === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
            }`}
          >
            {tab.label}
          </Link>
        ))}
        {/* Bracket shortcut */}
        <Link
          href="/bracket"
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
        >
          ⚔️ Round of 32
        </Link>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((match: any) => (
          <MatchCard
            key={match.id}
            match={match}
            userPick={match.picks?.[0]}
            isLoggedIn={!!userId}
          />
        ))}
        {matches.length === 0 && (
          <div className="col-span-full text-center py-20 bg-slate-900/20 border border-white/5 rounded-3xl space-y-3">
            <div className="text-4xl">⚽</div>
            <p className="text-slate-400 font-semibold">No matches found for this round.</p>
            <p className="text-slate-500 text-sm">
              Check back as the tournament progresses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
