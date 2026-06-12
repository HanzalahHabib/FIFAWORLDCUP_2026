'use client';

import { useState, useEffect } from 'react';
import { Settings, Users, Plus, Trophy, Award, Target } from 'lucide-react';

export default function AdminAdvancedControls({ teams }: { teams: any[] }) {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'matches' | 'polls'>('settings');
  
  // Settings State
  const [settings, setSettings] = useState<any>(null);
  
  // Users State
  const [users, setUsers] = useState<any[]>([]);

  // Match State
  const [matchData, setMatchData] = useState({ homeTeamId: '', awayTeamId: '', kickoffTimeUTC: '' });

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    setSettings(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    setUsers(await res.json());
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const handleSaveSettings = async () => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    alert('Settings Saved!');
  };

  const handleUpdatePoints = async (userId: string, points: number) => {
    await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, points })
    });
    fetchUsers();
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/custom-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    alert('Match Created!');
    setMatchData({ homeTeamId: '', awayTeamId: '', kickoffTimeUTC: '' });
  };

  const handleResolvePoll = async (type: string) => {
    const res = await fetch('/api/admin/resolve-polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type })
    });
    const data = await res.json();
    alert(data.message || data.error);
  };

  return (
    <div className="mt-12 space-y-6">
      <div className="flex space-x-2 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Settings</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Users & Points</button>
        <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'matches' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Custom Matches</button>
        <button onClick={() => setActiveTab('polls')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'polls' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Resolve Polls</button>
      </div>

      {activeTab === 'settings' && settings && (
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-400"/> Global Settings</h3>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Matches to Show (Days Ahead)</label>
            <input type="number" value={settings.matchesShowDays} onChange={e => setSettings({...settings, matchesShowDays: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Champion Pick Deadline</label>
            <input type="datetime-local" value={settings.championPickDeadline ? new Date(settings.championPickDeadline).toISOString().slice(0, 16) : ''} onChange={e => setSettings({...settings, championPickDeadline: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white" />
          </div>
          <button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded font-medium">Save Settings</button>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-panel p-6 rounded-xl space-y-4">
           <h3 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400"/> Leaderboard Point Edit</h3>
           <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
             {users.map(u => (
               <div key={u.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded border border-white/5">
                 <div>
                   <div className="font-bold text-white">{u.name}</div>
                   <div className="text-xs text-slate-400">{u.email}</div>
                 </div>
                 <div className="flex items-center gap-2">
                   <input type="number" value={u.points} onChange={(e) => {
                     const newUsers = [...users];
                     const idx = newUsers.findIndex(x => x.id === u.id);
                     newUsers[idx].points = parseInt(e.target.value);
                     setUsers(newUsers);
                   }} className="w-20 bg-black border border-white/10 rounded p-1 text-center text-white"/>
                   <button onClick={() => handleUpdatePoints(u.id, u.points)} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-1 rounded font-medium border border-emerald-500/50">Save</button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5 text-rose-400"/> Add Custom Match</h3>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Home Team</label>
                <select required value={matchData.homeTeamId} onChange={e => setMatchData({...matchData, homeTeamId: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white">
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Away Team</label>
                <select required value={matchData.awayTeamId} onChange={e => setMatchData({...matchData, awayTeamId: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white">
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Kickoff Time (Local)</label>
              <input type="datetime-local" required value={matchData.kickoffTimeUTC} onChange={e => setMatchData({...matchData, kickoffTimeUTC: e.target.value})} className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white" />
            </div>
            <button type="submit" className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded font-medium">Create Match</button>
          </form>
        </div>
      )}

      {activeTab === 'polls' && settings && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-400"/> Resolve Bonus Polls</h3>
          <p className="text-sm text-slate-400">Select the actual outcomes and award points to users who guessed correctly.</p>

          <div className="space-y-4">
            <div className="border border-white/10 p-4 rounded-lg bg-slate-900/30">
              <label className="block text-sm font-bold text-amber-400 mb-2 flex items-center gap-2"><Trophy className="w-4 h-4"/> Actual Champion</label>
              <div className="flex gap-2">
                <select value={settings.actualChampionId || ''} onChange={e => setSettings({...settings, actualChampionId: e.target.value})} className="flex-1 bg-slate-900 border border-white/10 rounded p-2 text-white">
                  <option value="">Select Champion</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={async () => { await handleSaveSettings(); handleResolvePoll('CHAMPION'); }} className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 px-4 py-2 rounded font-bold border border-amber-500/50">Save & Award</button>
              </div>
            </div>

            <div className="border border-white/10 p-4 rounded-lg bg-slate-900/30">
              <label className="block text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2"><Target className="w-4 h-4"/> Actual Unbeaten Team</label>
              <div className="flex gap-2">
                <select value={settings.actualUnbeatenTeamId || ''} onChange={e => setSettings({...settings, actualUnbeatenTeamId: e.target.value})} className="flex-1 bg-slate-900 border border-white/10 rounded p-2 text-white">
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={async () => { await handleSaveSettings(); handleResolvePoll('UNBEATEN'); }} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-4 py-2 rounded font-bold border border-emerald-500/50">Save & Award</button>
              </div>
            </div>

            <div className="border border-white/10 p-4 rounded-lg bg-slate-900/30">
              <label className="block text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2"><Award className="w-4 h-4"/> Actual Team with No Wins</label>
              <div className="flex gap-2">
                <select value={settings.actualNoWinTeamId || ''} onChange={e => setSettings({...settings, actualNoWinTeamId: e.target.value})} className="flex-1 bg-slate-900 border border-white/10 rounded p-2 text-white">
                  <option value="">Select Team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button onClick={async () => { await handleSaveSettings(); handleResolvePoll('NOWIN'); }} className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 px-4 py-2 rounded font-bold border border-indigo-500/50">Save & Award</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
