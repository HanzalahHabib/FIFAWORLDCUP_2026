'use client';

import { useState, useEffect } from 'react';
import { Settings, Users, Plus, Trophy, Award, Target, MessageSquare, Trash2, Download } from 'lucide-react';

export default function AdminAdvancedControls({ teams }: { teams: any[] }) {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'matches' | 'polls' | 'results'>('settings');
  
  // Settings State
  const [settings, setSettings] = useState<any>(null);
  
  // Users State
  const [users, setUsers] = useState<any[]>([]);

  // Match State
  const [matchData, setMatchData] = useState({ homeTeamId: '', awayTeamId: '', kickoffTimeUTC: '' });
  const [customMatches, setCustomMatches] = useState<any[]>([]);
  const [automaticMatches, setAutomaticMatches] = useState<any[]>([]);
  const [selectedAutoIds, setSelectedAutoIds] = useState<Set<string>>(new Set());
  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Match Override State
  const [overrideMatchNumber, setOverrideMatchNumber] = useState('');
  const [overrideHomeScore, setOverrideHomeScore] = useState('');
  const [overrideAwayScore, setOverrideAwayScore] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('FINISHED');
  const [overrideKickoff, setOverrideKickoff] = useState('');
  const [overrideMessage, setOverrideMessage] = useState<{text: string, ok: boolean} | null>(null);
  const [overrideLoading, setOverrideLoading] = useState(false);

  // Polls State
  const [polls, setPolls] = useState<any[]>([]);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState('');
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

  const handleMatchOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideLoading(true);
    setOverrideMessage(null);
    try {
      const res = await fetch('/api/admin/update-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchNumber: Number(overrideMatchNumber),
          status: overrideStatus,
          homeScore: overrideHomeScore !== '' ? Number(overrideHomeScore) : undefined,
          awayScore: overrideAwayScore !== '' ? Number(overrideAwayScore) : undefined,
          kickoffTimeUTC: overrideKickoff || undefined,
        })
      });
      const data = await res.json();
      setOverrideMessage({ text: data.message || data.error, ok: res.ok });
    } catch (err) {
      setOverrideMessage({ text: 'Network error', ok: false });
    } finally {
      setOverrideLoading(false);
    }
  };

  // Lazy loading tab data to speed up response and render times
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'matches') {
      fetchMatches();
    } else if (activeTab === 'polls') {
      fetchPolls();
    }
  }, [activeTab]);

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

  const toggleSelection = (id: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const toggleSelectAll = (matches: any[], set: Set<string>, setter: (s: Set<string>) => void) => {
    if (set.size === matches.length) {
      setter(new Set());
    } else {
      setter(new Set(matches.map(m => m.id)));
    }
  };

  const handleBulkDelete = async (ids: Set<string>, setter: (s: Set<string>) => void) => {
    const idsArr = Array.from(ids);
    if (idsArr.length === 0) { alert('No matches selected'); return; }
    if (!confirm(`Delete ${idsArr.length} match(es) and all their predictions? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/admin/custom-match', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsArr })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setter(new Set());
        fetchMatches();
      } else {
        alert(data.error || 'Failed to delete matches');
      }
    } catch (err) {
      alert('Error deleting matches');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const optionsArray = newPollOptions
      ? newPollOptions.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const res = await fetch('/api/admin/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: newPollQuestion, options: optionsArray })
    });
    if (res.ok) {
      setNewPollQuestion('');
      setNewPollOptions('');
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
    const selected = pollResolutions[pollId];
    if (!selected) {
      alert('Please select a winner first');
      return;
    }
    const pollObj = polls.find(p => p.id === pollId);
    const isCustom = pollObj && pollObj.options && pollObj.options.length > 0;

    const res = await fetch('/api/admin/polls', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: pollId, 
        action: 'RESOLVE', 
        resultTeamId: isCustom ? undefined : selected,
        resultOption: isCustom ? selected : undefined
      })
    });
    const data = await res.json();
    alert(data.message || data.error);
    fetchPolls();
    if (activeTab === 'users') {
      fetchUsers(); // Refresh points if users tab is already active
    }
  };

  return (
    <div className="mt-12 space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Settings</button>
        <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Users & Points</button>
        <button onClick={() => setActiveTab('matches')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'matches' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Manage Matches</button>
        <button onClick={() => setActiveTab('polls')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'polls' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>Manage Polls</button>
        <button onClick={() => setActiveTab('results')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'results' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}>⚽ Match Results</button>
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
           <div className="flex items-center justify-between">
             <h3 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-400"/> Leaderboard Point Edit</h3>
             <a
               href="/api/admin/export-csv"
               download
               className="flex items-center gap-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 px-4 py-2 rounded-lg font-bold border border-cyan-500/50 text-sm transition-colors"
             >
               <Download className="w-4 h-4" />
               Export Picks CSV
             </a>
           </div>
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
                          {u.picks.map((p: any) => {
                            const home = p.match?.homeTeam?.name || p.match?.homeTeamLabel || 'TBD';
                            const away = p.match?.awayTeam?.name || p.match?.awayTeamLabel || 'TBD';
                            const roundMap: Record<string,string> = { 'group-stage':'Group','round-of-32':'R32','round-of-16':'R16','quarter-finals':'QF','semi-finals':'SF','final':'Final' };
                            const roundLabel = roundMap[p.match?.round] || (p.match?.round || '');
                            const isKnockout = p.match?.round && p.match.round !== 'group-stage';
                            const pickedTeam = p.prediction === 'HOME' ? home : p.prediction === 'AWAY' ? away : 'DRAW';
                            return (
                              <div key={p.id} className="text-xs bg-black/50 p-3 rounded flex flex-col md:flex-row md:items-center justify-between gap-2 border border-white/5">
                                <div>
                                  {roundLabel && (
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mb-1 inline-block ${isKnockout ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{roundLabel}</span>
                                  )}
                                  <div className="text-slate-300 font-medium">{home} vs {away}</div>
                                  {p.match?.kickoffTimeUTC && (
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      {new Date(p.match.kickoffTimeUTC).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                <span className="font-bold text-emerald-400 whitespace-nowrap">{pickedTeam}</span>
                              </div>
                            );
                          })}
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
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-300">Automatic Matches (Synced)</h4>
              <div className="flex items-center gap-3">
                {automaticMatches.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedAutoIds.size === automaticMatches.length && automaticMatches.length > 0}
                      onChange={() => toggleSelectAll(automaticMatches, selectedAutoIds, setSelectedAutoIds)}
                      className="w-4 h-4 rounded border-white/20 bg-slate-900 accent-rose-500"
                    />
                    Select All
                  </label>
                )}
                {selectedAutoIds.size > 0 && (
                  <button
                    onClick={() => handleBulkDelete(selectedAutoIds, setSelectedAutoIds)}
                    disabled={bulkDeleting}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" />
                    {bulkDeleting ? 'Deleting...' : `Delete ${selectedAutoIds.size} Selected`}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {automaticMatches.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 bg-slate-900/50 p-4 rounded-xl border transition-colors cursor-pointer ${selectedAutoIds.has(m.id) ? 'border-rose-500/60 bg-rose-900/20' : 'border-white/5 hover:border-white/15'}`}
                  onClick={() => toggleSelection(m.id, selectedAutoIds, setSelectedAutoIds)}
                >
                  <input
                    type="checkbox"
                    checked={selectedAutoIds.has(m.id)}
                    onChange={() => toggleSelection(m.id, selectedAutoIds, setSelectedAutoIds)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-white/20 bg-slate-900 accent-rose-500 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{m.homeTeam?.name || m.homeTeamLabel || 'TBD'}</span>
                      <span className="text-xs text-slate-500 font-mono">vs</span>
                      <span>{m.awayTeam?.name || m.awayTeamLabel || 'TBD'}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Kickoff: {new Date(m.kickoffTimeUTC).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteMatch(m.id); }}
                    className="bg-rose-600/20 text-rose-400 hover:bg-rose-600/40 px-3 py-1.5 rounded-lg font-bold border border-rose-500/50 text-xs transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {automaticMatches.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-sm">No automatic matches.</div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-300">Custom Matches</h4>
              <div className="flex items-center gap-3">
                {customMatches.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedCustomIds.size === customMatches.length && customMatches.length > 0}
                      onChange={() => toggleSelectAll(customMatches, selectedCustomIds, setSelectedCustomIds)}
                      className="w-4 h-4 rounded border-white/20 bg-slate-900 accent-rose-500"
                    />
                    Select All
                  </label>
                )}
                {selectedCustomIds.size > 0 && (
                  <button
                    onClick={() => handleBulkDelete(selectedCustomIds, setSelectedCustomIds)}
                    disabled={bulkDeleting}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" />
                    {bulkDeleting ? 'Deleting...' : `Delete ${selectedCustomIds.size} Selected`}
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {customMatches.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 bg-slate-900/50 p-4 rounded-xl border transition-colors cursor-pointer ${selectedCustomIds.has(m.id) ? 'border-rose-500/60 bg-rose-900/20' : 'border-white/5 hover:border-white/15'}`}
                  onClick={() => toggleSelection(m.id, selectedCustomIds, setSelectedCustomIds)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCustomIds.has(m.id)}
                    onChange={() => toggleSelection(m.id, selectedCustomIds, setSelectedCustomIds)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-white/20 bg-slate-900 accent-rose-500 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{m.homeTeam?.name || m.homeTeamLabel || 'TBD'}</span>
                      <span className="text-xs text-slate-500 font-mono">vs</span>
                      <span>{m.awayTeam?.name || m.awayTeamLabel || 'TBD'}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Kickoff: {new Date(m.kickoffTimeUTC).toLocaleString()}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteMatch(m.id); }}
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
          <p className="text-sm text-slate-400">Create questions for users to answer. You can either use default team picks or enter custom options. Activate them to show them as a popup. When ready, select the winner and click "Resolve" to award 2 points to correct users.</p>

          <form onSubmit={handleCreatePoll} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Poll Question</label>
              <input 
                type="text" 
                placeholder="E.g. Who will win the Golden Boot?" 
                value={newPollQuestion} 
                onChange={e => setNewPollQuestion(e.target.value)} 
                className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white" 
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Custom Options (Optional - comma-separated, leave empty to default to all Teams)</label>
              <input 
                type="text" 
                placeholder="E.g. Messi, Mbappe, Haaland, Other" 
                value={newPollOptions} 
                onChange={e => setNewPollOptions(e.target.value)} 
                className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white" 
              />
            </div>
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded font-medium">Create Poll</button>
          </form>

          <div className="space-y-4 mt-6">
            {polls.map(poll => {
              // Calculate vote breakdown summary for premium feel
              const voteCounts: { [key: string]: number } = {};
              poll.votes?.forEach((vote: any) => {
                const choice = vote.option || vote.team?.name || 'Unknown';
                voteCounts[choice] = (voteCounts[choice] || 0) + 1;
              });

              return (
                <div key={poll.id} className="border border-white/10 p-4 rounded-lg bg-slate-900/30 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-white text-lg">{poll.question}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        Status: <span className={poll.isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>{poll.isActive ? 'Active (Popping up)' : 'Inactive'}</span>
                        {' '}• Votes: {poll._count?.votes || 0}
                        {poll.options && poll.options.length > 0 && (
                          <span className="text-cyan-400"> • Custom Options Poll</span>
                        )}
                      </div>
                      
                      {/* Vote breakdown summary */}
                      {poll.votes && poll.votes.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(voteCounts).map(([choice, count]) => (
                            <span key={choice} className="text-xs bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                              {choice}: {count}
                            </span>
                          ))}
                        </div>
                      )}

                      {poll.resultTeamId && (
                        <div className="text-sm text-amber-400 mt-1">
                          Resolved! Winning Team: {poll.resultTeam?.name}
                        </div>
                      )}
                      {poll.resultOption && (
                        <div className="text-sm text-amber-400 mt-1">
                          Resolved! Winning Option: {poll.resultOption}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {(!poll.resultTeamId && !poll.resultOption) && (
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
                              {poll.options && poll.options.length > 0 ? (
                                poll.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)
                              ) : (
                                teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                              )}
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

                  {/* Individual Votes list collapsible detail */}
                  <details className="mt-2 bg-black/40 border border-white/5 rounded-lg p-3 group">
                    <summary className="text-xs font-bold text-slate-400 cursor-pointer hover:text-white select-none">
                      View Individual Picks ({poll.votes?.length || 0})
                    </summary>
                    <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto pr-2 pt-2 border-t border-white/5">
                      {poll.votes && poll.votes.length > 0 ? (
                        poll.votes.map((vote: any) => {
                          const choice = vote.option || vote.team?.name || 'Unknown Choice';
                          return (
                            <div key={vote.id} className="text-xs bg-slate-950 p-2 rounded flex justify-between">
                              <span className="text-slate-400 font-medium">
                                {vote.user?.name} <span className="text-slate-600 font-mono">({vote.user?.email})</span>
                              </span>
                              <span className="font-bold text-cyan-400">{choice}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No picks recorded yet.</div>
                      )}
                    </div>
                  </details>
                </div>
              );
            })}
            {polls.length === 0 && (
              <div className="text-center py-6 text-slate-500 text-sm">No polls created yet.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="glass-panel p-6 rounded-xl space-y-6">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 mb-1">
              ⚽ Match Results Override
            </h3>
            <p className="text-sm text-slate-400">
              Manually mark a match as Finished and set the score. Use the match number (e.g. 80, 83) from the bracket. This immediately locks predictions for that match.
            </p>
          </div>

          <form onSubmit={handleMatchOverride} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Match Number *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 80"
                  value={overrideMatchNumber}
                  onChange={e => setOverrideMatchNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status *</label>
                <select
                  value={overrideStatus}
                  onChange={e => setOverrideStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white"
                >
                  <option value="FINISHED">FINISHED (locks predictions)</option>
                  <option value="LIVE">LIVE (locks predictions)</option>
                  <option value="SCHEDULED">SCHEDULED (unlocks predictions)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Home Score</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 3"
                  value={overrideHomeScore}
                  onChange={e => setOverrideHomeScore(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white placeholder-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Away Score</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1"
                  value={overrideAwayScore}
                  onChange={e => setOverrideAwayScore(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white placeholder-slate-600"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Kickoff Time Override (optional — UTC)</label>
                <input
                  type="datetime-local"
                  value={overrideKickoff}
                  onChange={e => setOverrideKickoff(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded p-2 text-white"
                />
              </div>
            </div>

            {overrideMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium ${overrideMessage.ok ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-rose-900/50 text-rose-300 border border-rose-500/30'}`}>
                {overrideMessage.ok ? '✅' : '❌'} {overrideMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={overrideLoading}
              className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
            >
              {overrideLoading ? 'Updating...' : 'Update Match'}
            </button>
          </form>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-slate-500">
              💡 <strong>Quick Reference:</strong> Match 80 = First R32 match. Match 83 = Fourth R32 match. Check your bracket page or the match admin tab to confirm match numbers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
