import prisma from '@/lib/prisma';
import MatchCard from '@/components/MatchCard';
import { Calendar } from 'lucide-react';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const revalidate = 60; // SSR with 60s revalidation

export default async function MatchesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let userId = null;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) userId = payload.userId;
  }

  const matches = await prisma.match.findMany({
    include: {
      homeTeam: true,
      awayTeam: true,
      picks: userId ? { where: { userId } } : false
    },
    orderBy: { kickoffTimeUTC: 'asc' }
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex justify-center items-center gap-3">
          <Calendar className="text-indigo-400 w-10 h-10" /> Match Center
        </h1>
        <p className="text-slate-400">Lock in your predictions before kickoff.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {matches.map((match) => (
          <MatchCard 
            key={match.id} 
            match={match} 
            userPick={match.picks?.[0]} 
            isLoggedIn={!!userId} 
          />
        ))}
        {matches.length === 0 && (
           <div className="col-span-full text-center py-12 text-slate-500">
             Match schedule is currently being finalized.
           </div>
        )}
      </div>
    </div>
  );
}
