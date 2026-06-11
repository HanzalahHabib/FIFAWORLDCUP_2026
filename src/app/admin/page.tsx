import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminActions from './AdminActions';

export const revalidate = 0; // Dynamic

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'ADMIN') {
    redirect('/'); // Kick out non-admins
  }

  const usersCount = await prisma.user.count();
  const picksCount = await prisma.pick.count();
  const matchesCount = await prisma.match.count();
  const finishedMatches = await prisma.match.count({ where: { status: 'FINISHED' } });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-rose-400">Master Control Center</h1>
        <p className="text-slate-400">Restricted Visibility. Administrator Access Only.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 rounded-xl text-center border-t-2 border-t-rose-500">
          <div className="text-3xl font-mono text-white">{usersCount}</div>
          <div className="text-xs text-slate-400 uppercase mt-1">Total Users</div>
        </div>
        <div className="glass-panel p-6 rounded-xl text-center border-t-2 border-t-indigo-500">
          <div className="text-3xl font-mono text-white">{picksCount}</div>
          <div className="text-xs text-slate-400 uppercase mt-1">Total Picks</div>
        </div>
        <div className="glass-panel p-6 rounded-xl text-center border-t-2 border-t-emerald-500">
          <div className="text-3xl font-mono text-white">{matchesCount}</div>
          <div className="text-xs text-slate-400 uppercase mt-1">Total Matches</div>
        </div>
        <div className="glass-panel p-6 rounded-xl text-center border-t-2 border-t-amber-500">
          <div className="text-3xl font-mono text-white">{finishedMatches}</div>
          <div className="text-xs text-slate-400 uppercase mt-1">Finished</div>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl border border-rose-500/30">
        <h2 className="text-2xl font-bold text-white mb-6">System Operations</h2>
        <AdminActions />
      </div>
    </div>
  );
}
