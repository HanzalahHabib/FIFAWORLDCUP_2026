'use client';

import { useState, useEffect } from 'react';
import { Trophy, Swords, Clock, CheckCircle, Activity } from 'lucide-react';
import Link from 'next/link';

// ─── Hardcoded ESPN Round of 32 Data (accurate as of Jun 28 2026) ─────────────
const ROUND_OF_32: Match[] = [
  { id: 'r32-1',  matchNum: 73,  home: 'South Africa', away: 'Canada',       date: 'Jun 28', time: 'LIVE', homeScore: 0, awayScore: 0, status: 'LIVE' },
  { id: 'r32-2',  matchNum: 74,  home: 'Germany',      away: 'Paraguay',     date: 'Jun 29', time: '4:30 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-3',  matchNum: 75,  home: 'Netherlands',  away: 'Morocco',      date: 'Jun 29', time: '9:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-4',  matchNum: 76,  home: 'Portugal',     away: 'Croatia',      date: 'Jun 30', time: '12:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-5',  matchNum: 77,  home: 'France',       away: 'Sweden',       date: 'Jun 30', time: '5:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-6',  matchNum: 78,  home: 'Brazil',       away: 'Japan',        date: 'Jun 30', time: '9:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-7',  matchNum: 79,  home: 'Spain',        away: 'Austria',      date: 'Jul 1',  time: '12:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-8',  matchNum: 80,  home: 'Argentina',    away: 'Cape Verde',   date: 'Jul 1',  time: '4:30 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-9',  matchNum: 81,  home: 'England',      away: 'DR Congo',     date: 'Jul 1',  time: '9:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-10', matchNum: 82,  home: 'USA',          away: 'Bosnia-Herz.', date: 'Jul 2',  time: '12:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-11', matchNum: 83,  home: 'Mexico',       away: 'Ecuador',      date: 'Jul 2',  time: '4:30 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-12', matchNum: 84,  home: 'Belgium',      away: 'Senegal',      date: 'Jul 2',  time: '9:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-13', matchNum: 85,  home: 'Colombia',     away: 'Ghana',        date: 'Jul 3',  time: '12:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-14', matchNum: 86,  home: 'Switzerland',  away: 'Algeria',      date: 'Jul 3',  time: '4:30 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-15', matchNum: 87,  home: 'Ivory Coast',  away: 'Norway',       date: 'Jul 3',  time: '9:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
  { id: 'r32-16', matchNum: 88,  home: 'Australia',    away: 'Egypt',        date: 'Jul 4',  time: '12:00 PM', homeScore: null, awayScore: null, status: 'SCHEDULED' },
];

const LATER_ROUNDS = [
  { round: 'Round of 16', matches: 8,  note: 'Jul 5–8' },
  { round: 'Quarter-finals', matches: 4, note: 'Jul 10–11' },
  { round: 'Semi-finals', matches: 2,  note: 'Jul 14–15' },
  { round: 'Final', matches: 1,        note: 'Jul 19' },
];

interface Match {
  id: string;
  matchNum: number;
  home: string;
  away: string;
  date: string;
  time: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
}

interface UserPick {
  matchId: string;
  prediction: 'HOME' | 'DRAW' | 'AWAY';
}

const FLAG_CODES: Record<string, string> = {
  'South Africa': 'za', 'Canada': 'ca', 'Germany': 'de', 'Paraguay': 'py',
  'Netherlands': 'nl', 'Morocco': 'ma', 'Portugal': 'pt', 'Croatia': 'hr',
  'France': 'fr', 'Sweden': 'se', 'Brazil': 'br', 'Japan': 'jp',
  'Spain': 'es', 'Austria': 'at', 'Argentina': 'ar', 'Cape Verde': 'cv',
  'England': 'gb-eng', 'DR Congo': 'cd', 'USA': 'us', 'Bosnia-Herz.': 'ba',
  'Mexico': 'mx', 'Ecuador': 'ec', 'Belgium': 'be', 'Senegal': 'sn',
  'Colombia': 'co', 'Ghana': 'gh', 'Switzerland': 'ch', 'Algeria': 'dz',
  'Ivory Coast': 'ci', 'Norway': 'no', 'Australia': 'au', 'Egypt': 'eg',
};

function FlagEmoji({ team }: { team: string }) {
  const code = FLAG_CODES[team];
  if (!code) return <span className="w-6 h-5 bg-slate-700 rounded inline-block" />;
  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      alt={team}
      width={24}
      height={18}
      className="rounded-sm object-cover"
      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
    />
  );
}

export default function BracketPage() {
  const [picks, setPicks] = useState<Record<string, 'HOME' | 'DRAW' | 'AWAY'>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState<Record<string, string>>({});
  const [dbMatchIds, setDbMatchIds] = useState<Record<number, string>>({}); // apiFootballId -> dbId

  useEffect(() => {
    // Load user picks
    fetch('/api/picks')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const pickMap: Record<string, 'HOME' | 'DRAW' | 'AWAY'> = {};
          data.forEach((p: UserPick) => { pickMap[p.matchId] = p.prediction; });
          setPicks(pickMap);
          setIsLoggedIn(true);
        }
      })
      .catch(() => setIsLoggedIn(false));

    // Load DB match IDs mapped to apiFootballId (so we can post picks)
    fetch('/api/matches/r32-ids')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setDbMatchIds(data); // { [apiFootballId]: dbId }
        }
      })
      .catch(() => {});
  }, []);


  const handlePick = async (matchNum: number, localId: string, prediction: 'HOME' | 'DRAW' | 'AWAY') => {
    if (!isLoggedIn) return;
    // Resolve real DB match ID from apiFootballId; fall back to local ID
    const dbId = dbMatchIds[matchNum] || localId;
    setSubmitting(localId + prediction);
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: dbId, prediction }),
      });
      const data = await res.json();
      if (res.ok) {
        // Store pick by both local and db id for UI update
        setPicks(p => ({ ...p, [localId]: prediction, [dbId]: prediction }));
        setMessage(m => ({ ...m, [localId]: '✓ Pick saved!' }));
        setTimeout(() => setMessage(m => { const n = {...m}; delete n[localId]; return n; }), 2000);
      } else {
        setMessage(m => ({ ...m, [localId]: data.error || 'Error saving pick' }));
      }
    } catch {
      setMessage(m => ({ ...m, [localId]: 'Network error' }));
    } finally {
      setSubmitting(null);
    }
  };

  const MatchCard = ({ match }: { match: Match }) => {
    const userPick = picks[match.id];
    const isLive = match.status === 'LIVE';
    const isFinished = match.status === 'FINISHED';
    const isLocked = isLive || isFinished;

    return (
      <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
        isLive
          ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-slate-900'
          : 'border-white/8 bg-slate-900/80 hover:border-indigo-500/30'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-widest ${
          isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/60 text-slate-400'
        }`}>
          <span>Match #{match.matchNum}</span>
          <span className="flex items-center gap-1.5">
            {isLive && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            {isLive ? 'LIVE' : isFinished ? 'FT' : `${match.date} · ${match.time}`}
          </span>
        </div>

        {/* Teams */}
        <div className="px-4 py-3 space-y-3">
          {/* Home */}
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
            userPick === 'HOME' ? 'bg-indigo-600/25 border border-indigo-500/40' : 'bg-slate-800/40'
          }`}>
            <div className="flex items-center gap-2.5">
              <FlagEmoji team={match.home} />
              <span className={`text-sm font-bold ${userPick === 'HOME' ? 'text-indigo-200' : 'text-white'}`}>
                {match.home}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isFinished || isLive ? (
                <span className={`font-mono text-xl font-black ${
                  (match.homeScore ?? 0) > (match.awayScore ?? 0) ? 'text-emerald-400' : 'text-slate-300'
                }`}>{match.homeScore ?? 0}</span>
              ) : (
                userPick === 'HOME' && <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded uppercase">Pick</span>
              )}
            </div>
          </div>

          {/* Score divider */}
          {(isLive || isFinished) && (
            <div className="flex items-center justify-center gap-3 text-slate-500">
              <div className="flex-1 h-px bg-white/5" />
              <span className="text-[11px] uppercase tracking-wider">vs</span>
              <div className="flex-1 h-px bg-white/5" />
            </div>
          )}
          {!isLive && !isFinished && (
            <div className="flex items-center justify-center">
              <span className="text-slate-600 text-sm font-bold">vs</span>
            </div>
          )}

          {/* Away */}
          <div className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
            userPick === 'AWAY' ? 'bg-indigo-600/25 border border-indigo-500/40' : 'bg-slate-800/40'
          }`}>
            <div className="flex items-center gap-2.5">
              <FlagEmoji team={match.away} />
              <span className={`text-sm font-bold ${userPick === 'AWAY' ? 'text-indigo-200' : 'text-white'}`}>
                {match.away}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isFinished || isLive ? (
                <span className={`font-mono text-xl font-black ${
                  (match.awayScore ?? 0) > (match.homeScore ?? 0) ? 'text-emerald-400' : 'text-slate-300'
                }`}>{match.awayScore ?? 0}</span>
              ) : (
                userPick === 'AWAY' && <span className="text-[10px] text-indigo-400 font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded uppercase">Pick</span>
              )}
            </div>
          </div>

          {/* Pick Buttons - Knockout = no draw */}
          {!isLocked && isLoggedIn && (
            <div className="flex gap-2 pt-1">
              {(['HOME', 'AWAY'] as const).map(pred => {
                const label = pred === 'HOME' ? match.home : match.away;
                const isSelected = userPick === pred;
                const isLoading = submitting === match.id + pred;
                return (
                  <button
                    key={pred}
                    onClick={() => handlePick(match.matchNum, match.id, pred)}
                    disabled={isLoading}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all truncate px-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-white/5'
                    }`}
                  >
                    {isLoading ? '...' : label.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          )}

          {!isLoggedIn && !isLocked && (
            <Link href="/login" className="block text-center text-[11px] text-indigo-400 hover:text-indigo-300 py-1 transition-colors">
              Log in to predict →
            </Link>
          )}

          {message[match.id] && (
            <p className="text-center text-[11px] text-emerald-400 font-bold">{message[match.id]}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 text-yellow-400 text-xs font-bold uppercase tracking-widest mb-2">
          <Activity className="w-3.5 h-3.5" /> Live Tournament
        </div>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500">
          FIFA World Cup 2026
        </h1>
        <p className="text-xl font-bold text-white">Tournament Bracket</p>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Predict every knockout match. Qualifying Round of 32 is underway!
        </p>
      </div>

      {/* Round of 32 */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/50 to-transparent" />
          <div className="flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-5 py-1.5">
            <Swords className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300 font-bold text-sm tracking-wider">ROUND OF 32</span>
            <span className="text-indigo-500 text-xs">Jun 28 – Jul 4</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-indigo-500/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ROUND_OF_32.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      {/* Later Rounds - Coming Soon */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {LATER_ROUNDS.map(r => (
          <div key={r.round} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 text-center space-y-2 opacity-60">
            <Clock className="w-6 h-6 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-slate-300">{r.round}</div>
            <div className="text-xs text-slate-500">{r.note}</div>
            <div className="text-xs text-slate-600">{r.matches} {r.matches === 1 ? 'match' : 'matches'}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
