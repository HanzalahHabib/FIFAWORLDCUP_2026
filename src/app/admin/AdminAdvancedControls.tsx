'use client';

import { useState, useEffect } from 'react';
import { Settings, Users, Plus, Trophy, Award, Target, MessageSquare } from 'lucide-react';

export default function AdminAdvancedControls({ teams }: { teams: any[] }) {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'matches' | 'polls'>('settings');
  
  // Settings State
  const [settings, setSettings] = useState<any>(null);
  
  // Users State
  const [users, setUsers] = useState<any[]>([]);

  // Match State
  const [matchData, setMatchData] = useState({ homeTeamId: '', awayTeamId: '', kickoffTimeUTC: '' });
  const [customMatches, setCustomMatches] = useState<any[]>([]);
  const [automaticMatches, setAutomaticMatches] = useState<any[]>([]);

  // Polls State
  const [polls, setPolls] = useState<any[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [pollResolutions, setPollResolutions] = useState<{ [key: string]: string }>({});

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    setSettings(await res.json());
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    setUsers(await res.json());
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/admin/custom-match');
      if (res.ok) {
        const data = await res.json();
        setCustomMatches(data.customMatches || []);
        setAutomaticMatches(data.automaticMatches || []);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    }
  };

  const fetchPolls = async () => {
    try {
      const res = await fetch('/api/admin/polls');
      if (res.ok) {
        const data = await res.json();
        setPolls(data.polls || []);
      }
    } catch (err) {
      console.error('Error fetching polls:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    fetchMatches();
    fetchPolls();
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
    const res = await fetch('/api/admin/custom-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData)
    });
    if (res.ok) {
      alert('Match Created!');
      setMatchData({ homeTeamId: '', awayTeamId: '', kickoffTimeUTC: '' });
      fetchMatches();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to create match');
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to delete this match? All associated predictions will be lost.')) return;
    try {
      const res = await fetch(`/api/admin/custom-match?id=${matchId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        alert('Match deleted successfully');
        fetchMatches();
      } else {
        alert(data.error || 'Failed to delete match');
      }
    } catch (err) {
      alert('Error deleting match');
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: newPollQuestion })
    });
    if (res.ok) {
      setNewPollQuestion('');
      fetchPolls();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to create poll');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;
    await fetch(`/api/admin/polls?id=${pollId}`, { method: 'DELETE' });
    fetchPolls();
  };

  const handleTogglePollActive = async (pollId: string, isActive: boolean) => {
    await fetch('/api/admin/polls', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pollId, action: 'TOGGLE_ACTIVE', isActive })
    });
    fetchPolls();
  };

  const handleResolvePoll = async (pollId: string) => {
    const resultTeamId = pollResolutions[pollId];
    if (!resultTeamId) {
      alert('Please select a winning team first');
      return;
    }
    const res = await fetch('/api/admin/polls', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pollId, action: 'RESOLVE', resultTeamId })
    });
    const data = await res.json();
    alert(data.message || data.error);
    fetchPolls();
    fetchUsers(); // To refresh points
  };

  return (
    <div className="mt-12 space-y-6">
      <div className="flex space-x-2 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Settings</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Users & Points</button>
        <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'matches' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Manage Matches</button>
        <button onClick={() => setActiveTab('polls')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'polls' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Manage Polls</button>
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
               <details key={u.id} className="bg-slate-900/50 rounded border border-white/5 group">
                 <summary className="flex items-center justify-between p-3 cursor-pointer list-none">
                   <div>
                     <div className="font-bold text-white group-open:text-emerald-400 transition-colors">{u.name}</div>
                     <div className="text-xs text-slate-400">{u.email}</div>
                   </div>
                   <div className="flex items-center gap-2">
                     <input type="number" value={u.points} onClick={e => e.stopPropagation()} onChange={(e) => {
                       const newUsers = [...users];
                       const idx = newUsers.findIndex(x => x.id === u.id);
                       newUsers[idx].points = parseInt(e.target.value);
                       setUsers(newUsers);
                     }} className="w-20 bg-black border border-white/10 rounded p-1 text-center text-white"/>
                     <button onClick={(e) => { e.stopPropagation(); handleUpdatePoints(u.id, u.points); }} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 px-3 py-1 rounded font-medium border border-emerald-500/50">Save</button>
                   </div>
                 </summary>
                 <div className="p-3 pt-0 border-t border-white/5 space-y-4">
                   {u.picks && u.picks.length > 0 && (
                     <div>
                       <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Match Picks</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                         {u.picks.map((p: any) => (
                           <div key={p.id} className="text-xs bg-black/50 p-2 rounded flex justify-between">
                             <span className="text-slate-400">{p.match?.homeTeam?.name} vs {p.match?.awayTeam?.name}</span>
                             <span className="font-bold text-emerald-400">{p.prediction === 'HOME' ? p.match?.homeTeam?.name : p.prediction === 'AWAY' ? p.match?.awayTeam?.name : 'DRAW'}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   {(u.firstPlaceId || u.unbeatenTeamId || u.noWinTeamId) && (
                     <div>
                       <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Bonus Selections</h4>
                       <div className="text-xs grid grid-cols-2 gap-2 bg-black/50 p-2 rounded text-slate-400">
                         {u.firstPlaceId && <div>1st Place ID: <span className="text-white">{u.firstPlaceId}</span></div>}
                         {u.secondPlaceId && <div>2nd Place ID: <span className="text-white">{u.secondPlaceId}</span></div>}
                         {u.thirdPlaceId && <div>3rd Place ID: <span className="text-white">{u.thirdPlaceId}</span></div>}
                         {u.fourthPlaceId && <div>4th Place ID: <span className="text-white">{u.fourthPlaceId}</span></div>}
                         {u.unbeatenTeamId && <div>Unbeaten Team ID: <span className="text-white">{u.unbeatenTeamId}</span></div>}
                         {u.noWinTeamId && <div>No Win Team ID: <span className="text-white">{u.noWinTeamId}</span></div>}
                       </div>
                     </div>
                   )}
                 </div>
               </details>
             ))}
           </div>
        </div>
      )}

      {activeTab === 'matches' && (
        <div className="space-y-6">
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

          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h4 className="text-lg font-bold text-slate-300">Automatic Matches (Synced)</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {automaticMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{m.homeTeam?.name || 'TBD'}</span>
                      <span className="text-xs text-slate-500 font-mono">vs</span>
                      <span>{m.awayTeam?.name || 'TBD'}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Kickoff: {new Date(m.kickoffTimeUTC).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteMatch(m.id)}
                    className="bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-3 py-1.5 rounded-lg font-bold border border-rose-500/50 text-xs transition-colors"
                  >
                    Delete from App
                  </button>
                </div>
              ))}
              {automaticMatches.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">No automatic matches.</div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl space-y-4">
            <h4 className="text-lg font-bold text-slate-300">Custom Matches</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {customMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{m.homeTeam?.name || 'TBD'}</span>
                      <span className="text-xs text-slate-500 font-mono">vs</span>
                      <span>{m.awayTeam?.name || 'TBD'}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Kickoff: {new Date(m.kickoffTimeUTC).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteMatch(m.id)}
                    className="bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-3 py-1.5 rounded-lg font-bold border border-rose-500/50 text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {customMatches.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">No custom matches active.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'polls' && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-cyan-400"/> Dynamic Custom Polls</h3>
          <p className="text-sm text-slate-400">Create questions for users to answer (e.g., "Who will be unbeaten?"). Activate them to show them as a popup. When ready, select the winner and click "Resolve" to award 5 points to correct users.</p>

          <form onSubmit={handleCreatePoll} className="flex gap-2">
            <input 
              type="text" 
              placeholder="E.g. Which team will have 0 wins?" 
              value={newPollQuestion} 
              onChange={e => setNewPollQuestion(e.target.value)} 
              className="flex-1 bg-slate-900 border border-white/10 rounded p-2 text-white" 
              required
            />
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-medium">Create Poll</button>
          </form>

          <div className="space-y-4 mt-6">
            {polls.map(poll => (
              <div key={poll.id} className="border border-white/10 p-4 rounded-lg bg-slate-900/30 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1">
                  <div className="font-bold text-white text-lg">{poll.question}</div>
                  <div className="text-sm text-slate-400 mt-1">
                    Status: <span className={poll.isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{poll.isActive ? 'Active (Popping up)' : 'Inactive'}</span>
                    {' '}• Votes: {poll._count?.votes || 0}
                  </div>
                  {poll.resultTeamId && (
                    <div className="text-sm text-amber-400 mt-1">
                      Resolved! Winning Team: {poll.resultTeam?.name}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  {!poll.resultTeamId && (
                    <>
                      <button 
                        onClick={() => handleTogglePollActive(poll.id, !poll.isActive)}
                        className={`px-3 py-1.5 rounded-lg font-bold border text-xs transition-colors ${poll.isActive ? 'bg-amber-600/20 text-amber-400 border-amber-500/50 hover:bg-amber-600/40' : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-600/40'}`}
                      >
                        {poll.isActive ? 'Deactivate Popup' : 'Activate Popup'}
                      </button>
                      
                      <div className="flex gap-2 mt-2">
                        <select 
                          value={pollResolutions[poll.id] || ''} 
                          onChange={e => setPollResolutions({...pollResolutions, [poll.id]: e.target.value})} 
                          className="flex-1 bg-black border border-white/10 rounded p-1.5 text-xs text-white"
                        >
                          <option value="">Select Winner...</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <button 
                          onClick={() => handleResolvePoll(poll.id)}
                          className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 px-2 py-1.5 rounded-lg font-bold border border-indigo-500/50 text-xs"
                        >
                          Resolve
                        </button>
                      </div>
                    </>
                  )}
                  
                  <button 
                    onClick={() => handleDeletePoll(poll.id)}
                    className="bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-3 py-1.5 rounded-lg font-bold border border-rose-500/50 text-xs transition-colors mt-2"
                  >
                    Delete Poll
                  </button>
                </div>
              </div>
            ))}
            {polls.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">No polls created yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
