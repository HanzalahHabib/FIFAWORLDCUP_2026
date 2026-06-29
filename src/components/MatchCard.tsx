'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check, Trophy } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MatchProps = {
  match: any;
  userPick: any;
  isLoggedIn: boolean;
};

// Rounds where a Draw is impossible (knockout = one team must advance)
const KNOCKOUT_ROUNDS = new Set([
  'round-of-32',
  'round-of-16',
  'quarter-finals',
  'semi-finals',
  'third-place',
  'final',
]);

const ROUND_LABELS: Record<string, string> = {
  'group-stage':   'Group Stage',
  'round-of-32':   '⚔️ Round of 32',
  'round-of-16':   'Round of 16',
  'quarter-finals':'Quarter-final',
  'semi-finals':   'Semi-final',
  'third-place':   '3rd Place',
  'final':         '🏆 Final',
};

export default function MatchCard({ match, userPick, isLoggedIn }: MatchProps) {
  const [loading, setLoading] = useState(false);
  const [pick, setPick] = useState(userPick?.prediction || null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const now = new Date();
  const kickoff = new Date(match.kickoffTimeUTC);
  const isFinished = match.status === 'FINISHED' || (match.homeScore !== null && match.awayScore !== null);
  const isLocked = now >= kickoff || isFinished;
  const isLive = !isFinished && (match.status === 'IN_PLAY' || match.status === 'LIVE' || match.status === 'HALFTIME');

  const round = match.round ?? 'group-stage';
  const isKnockout = KNOCKOUT_ROUNDS.has(round);

  const homeLabel = match.homeTeam?.name || match.homeTeamLabel || 'TBD';
  const awayLabel = match.awayTeam?.name || match.awayTeamLabel || 'TBD';

  const handlePick = async (prediction: string) => {
    if (!isLoggedIn) {
      setError('Log in to make a pick');
      return;
    }
    if (isLocked) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, prediction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPick(prediction);
      setSuccessMsg('✓ Pick saved!');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPickButton = (type: string, label: string) => {
    const isSelected = pick === type;
    const isWinner = isFinished &&
      ((type === 'HOME' && match.homeScore > match.awayScore) ||
       (type === 'AWAY' && match.awayScore > match.homeScore) ||
       (type === 'DRAW' && match.homeScore === match.awayScore));

    return (
      <button
        key={type}
        onClick={() => handlePick(type)}
        disabled={isLocked || loading}
        className={`flex-1 py-2 px-3 rounded-lg font-bold text-sm transition-all relative overflow-hidden
          ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5'}
          ${isLocked && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}
          ${isWinner ? 'ring-2 ring-emerald-500' : ''}
        `}
      >
        <span className="truncate block">{label}</span>
        {isSelected && <Check className="w-3.5 h-3.5 absolute top-1 right-1 opacity-60" />}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 relative"
    >
      {/* Round badge */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
          isKnockout
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
            : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
        }`}>
          {ROUND_LABELS[round] || round}
        </span>
        {isFinished && (
          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20">
            COMPLETED
          </span>
        )}
        {isLive && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </span>
        )}
        {!isFinished && isLocked && !isLive && (
          <div className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-rose-500/20">
            <Lock className="w-3 h-3" /> LOCKED
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="text-center space-y-1">
        <p className="text-xs text-slate-500 font-mono" suppressHydrationWarning>{kickoff.toLocaleString()}</p>
        <div className="flex justify-between items-center px-2 pt-2 gap-2">
          <div className="text-lg font-bold text-white flex-1 text-right leading-tight">{homeLabel}</div>
          <div className="px-3 font-mono text-slate-500 shrink-0">
            {isLive || isFinished
              ? <span className="text-xl font-black text-white">{match.homeScore ?? 0} – {match.awayScore ?? 0}</span>
              : <span className="text-sm">vs</span>
            }
          </div>
          <div className="text-lg font-bold text-white flex-1 text-left leading-tight">{awayLabel}</div>
        </div>
      </div>

      {/* Pick Buttons */}
      <div className="flex gap-2">
        {renderPickButton('HOME', homeLabel)}
        {/* No Draw for knockout rounds */}
        {!isKnockout && renderPickButton('DRAW', 'Draw')}
        {renderPickButton('AWAY', awayLabel)}
      </div>

      {/* Knockout indicator */}
      {isKnockout && !isLocked && (
        <p className="text-center text-[10px] text-amber-500/70 font-medium flex items-center justify-center gap-1">
          <Trophy className="w-3 h-3" /> Knockout — pick the winner
        </p>
      )}

      {successMsg && <p className="text-emerald-400 text-xs text-center font-bold">{successMsg}</p>}
      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
    </motion.div>
  );
}
