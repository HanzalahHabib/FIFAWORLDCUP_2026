'use client';

import { useState } from 'react';
import { RefreshCw, Calculator, Download } from 'lucide-react';

export default function AdminActions() {
  const [syncing, setSyncing] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [addingPoints, setAddingPoints] = useState(false);
  const [message, setMessage] = useState('');

  const handleAddPoints = async () => {
    setAddingPoints(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/add-points', { method: 'POST' });
      const data = await res.json();
      setMessage(data.message || data.error);
    } catch (err: any) {
      setMessage('Error adding points');
    } finally {
      setAddingPoints(false);
    }
  };

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
          {syncing ? 'Syncing...' : 'Sync 2026 World Cup Data'}
        </button>

        <button 
          onClick={handleCalculate} 
          disabled={calculating}
          className="flex-1 bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/50 text-amber-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          <Calculator className={`w-5 h-5 ${calculating ? 'animate-pulse' : ''}`} />
          {calculating ? 'Calculating...' : 'Recalculate Global Scores'}
        </button>

        <button 
          onClick={handleAddPoints} 
          disabled={addingPoints}
          className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          <Calculator className={`w-5 h-5 ${addingPoints ? 'animate-pulse' : ''}`} />
          {addingPoints ? 'Adding...' : 'Give 1 Point to All'}
        </button>

        <a 
          href="/api/admin/export-csv"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 text-indigo-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          <Download className="w-5 h-5" />
          Export All Data (CSV)
        </a>
      </div>

      {message && (
        <div className="p-4 bg-black/40 border border-white/10 rounded-lg text-center font-mono text-sm text-emerald-400">
          {message}
        </div>
      )}
    </div>
  );
}
