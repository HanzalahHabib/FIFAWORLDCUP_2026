'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
type MatchProps = {
  match: any;
  userPick: any;
  isLoggedIn: boolean;
};

export default function MatchCard({ match, userPick, isLoggedIn }: MatchProps) {
  const [loading, setLoading] = useState(false);
  const [pick, setPick] = useState(userPick?.prediction || null);
  const [error, setError] = useState('');

  const now = new Date();
  const kickoff = new Date(match.kickoffTimeUTC);
  const isLocked = now >= kickoff || match.status === 'FINISHED';
  
  const handlePick = async (prediction: string) => {
    if (!isLoggedIn) {
      setError('Log in to make a pick');
      return;
    }
    if (isLocked || pick) return; // Cannot modify pick

    setLoading(true);
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, prediction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPick(prediction);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPickButton = (type: string, label: string) => {
    const isSelected = pick === type;
    const isWinner = match.status === 'FINISHED' && 
      ((type === 'HOME' && match.homeScore > match.awayScore) ||
       (type === 'AWAY' && match.awayScore > match.homeScore) ||
       (type === 'DRAW' && match.homeScore === match.awayScore));
    
    return (
      <button
        key={type}
        onClick={() => handlePick(type)}
        disabled={isLocked || !!pick || loading}
        className={`flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all relative overflow-hidden
          ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
          ${isLocked && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}
          ${isWinner ? 'ring-2 ring-emerald-500' : ''}
        `}
      >
        {label}
        {isSelected && <Check className="w-4 h-4 absolute top-1 right-1 opacity-50" />}
      </button>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 relative"
    >
      {isLocked && (
        <div className="absolute top-4 right-4 text-rose-400 bg-rose-500/10 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
          <Lock className="w-3 h-3" /> LOCKED
        </div>
      )}
      
      <div className="text-center space-y-1">
        <p className="text-xs text-slate-400 font-mono">{kickoff.toLocaleString()}</p>
        <div className="flex justify-between items-center px-4 pt-2">
          <div className="text-xl font-bold text-white flex-1 text-right">{match.homeTeam?.name || 'TBD'}</div>
          <div className="px-4 font-mono text-lg text-slate-500">vs</div>
          <div className="text-xl font-bold text-white flex-1 text-left">{match.awayTeam?.name || 'TBD'}</div>
        </div>
        
        {match.status === 'FINISHED' && (
          <div className="text-2xl font-black text-emerald-400 tracking-widest mt-2">
            {match.homeScore} - {match.awayScore}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {renderPickButton("HOME", "Home")}
        {renderPickButton("DRAW", "Draw")}
        {renderPickButton("AWAY", "Away")}
      </div>

      {error && <p className="text-rose-400 text-xs text-center">{error}</p>}
    </motion.div>
  );
}
