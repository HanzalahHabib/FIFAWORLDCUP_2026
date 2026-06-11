'use client';

import { useState } from 'react';
import { RefreshCw, Calculator } from 'lucide-react';

export default function AdminActions() {
  const [syncing, setSyncing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/sync-matches', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || data.error);
    } catch (err: any) {
      setMessage('Error syncing matches');
    } finally {
      setSyncing(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/calculate-scores', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || data.error);
    } catch (err: any) {
      setMessage('Error calculating scores');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={handleSync} 
          disabled={syncing}
          className="flex-1 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/50 text-rose-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Force Data Sync (Mock API)'}
        </button>

        <button 
          onClick={handleCalculate} 
          disabled={calculating}
          className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 text-amber-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          <Calculator className={`w-5 h-5 ${calculating ? 'animate-pulse' : ''}`} />
          {calculating ? 'Calculating...' : 'Recalculate Global Scores'}
        </button>
      </div>

      {message && (
        <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-center font-mono text-sm text-emerald-400">
          {message}
        </div>
      )}
    </div>
  );
}
