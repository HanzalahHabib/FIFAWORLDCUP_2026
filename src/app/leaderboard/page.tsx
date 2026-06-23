import prisma from '@/lib/prisma';
import { Trophy, Medal, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({
    orderBy: { points: 'desc' },
    take: 100, // Top 100
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex justify-center items-center gap-3">
          <Trophy className="text-yellow-400 w-10 h-10" /> Global Leaderboard
        </h1>
        <p className="text-slate-400">The top 100 predictors from both cohorts.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/50 text-slate-300 text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Rank</th>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Cohort</th>
                <th className="px-6 py-4 font-semibold text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user, idx) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {idx === 0 ? <Medal className="text-yellow-400 w-6 h-6 inline-block mr-2" /> :
                     idx === 1 ? <Medal className="text-slate-300 w-6 h-6 inline-block mr-2" /> :
                     idx === 2 ? <Medal className="text-amber-600 w-6 h-6 inline-block mr-2" /> :
                     <span className="text-slate-500 font-mono w-6 inline-block text-center mr-2">{idx + 1}</span>}
                  </td>
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                    {user.name} {user.role === 'ADMIN' && <Star className="w-4 h-4 text-indigo-400" />}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.cohort === 'West Side' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                      {user.cohort}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-lg font-bold text-white">
                    {user.points}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No users have joined the arena yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
