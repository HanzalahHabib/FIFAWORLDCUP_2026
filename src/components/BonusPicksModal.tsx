'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, AlertTriangle, HelpCircle, Lock, Sparkles, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  group: string;
  flagUrl: string | null;
}

export default function BonusPicksModal() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  
  // Selection states
  const [championId, setChampionId] = useState('');
  const [unbeatenId, setUnbeatenId] = useState('');
  const [noWinId, setNoWinId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkBonusPicks() {
      try {
        const res = await fetch('/api/user/bonus-picks');
        if (!res.ok) {
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        const { predictions, deadline, teams } = data;
        
        setTeams(teams || []);
        setDeadline(deadline);

        // Check if user has already submitted all picks
        const hasSubmitted = predictions.firstPlaceId && predictions.unbeatenTeamId && predictions.noWinTeamId;
        
        // Check if deadline has passed
        const isPastDeadline = deadline ? new Date() >= new Date(deadline) : false;

        if (!hasSubmitted && !isPastDeadline) {
          setShow(true);
        }
      } catch (err) {
        console.error('Error checking bonus picks:', err);
      } finally {
        setLoading(false);
      }
    }

    checkBonusPicks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!championId || !unbeatenId || !noWinId) {
      setError('Please make a selection for all three polls.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/user/bonus-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstPlaceId: championId,
          unbeatenTeamId: unbeatenId,
          noWinTeamId: noWinId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit predictions');

      setSuccess(true);
      setTimeout(() => {
        setShow(false);
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !show) return null;

  const formattedDeadline = deadline 
    ? new Date(deadline).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }) 
    : 'start of the tournament';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShow(false)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl backdrop-blur-md md:p-8"
        >
          {/* Close button */}
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center space-y-4"
            >
              <div className="rounded-full bg-emerald-500/20 p-4 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="w-12 h-12 animate-pulse" />
              </div>
              <h3 className="text-2xl font-bold text-white">Predictions Locked In!</h3>
              <p className="text-slate-400">Your tournament picks have been successfully recorded.</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="space-y-2 text-center">
                <div className="inline-flex rounded-full bg-indigo-500/10 p-3 text-indigo-400 border border-indigo-500/20 mb-2">
                  <Trophy className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  Tournament predictions
                </h2>
                <p className="text-sm text-slate-400">
                  Select your predictions for the main events. These can only be set <span className="text-indigo-400 font-bold">once</span> and will lock.
                </p>
              </div>

              {/* Deadline Badge */}
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 flex gap-3 items-start text-amber-300 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-0.5">Time Lock Active</span>
                  You must submit your picks before: <span className="font-mono text-white">{formattedDeadline}</span>.
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  {/* Champion Prediction */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" /> Predict Tournament Champion
                    </label>
                    <select
                      value={championId}
                      onChange={(e) => setChampionId(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Choose Champion Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Unbeaten Prediction */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-400" /> Predict Unbeaten Team
                    </label>
                    <select
                      value={unbeatenId}
                      onChange={(e) => setUnbeatenId(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Choose Unbeaten Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 0 Wins Prediction */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-1 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-rose-400" /> Predict Team with 0 Wins
                    </label>
                    <select
                      value={noWinId}
                      onChange={(e) => setNoWinId(e.target.value)}
                      className="w-full bg-slate-900/80 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">-- Choose 0-Wins Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-400 text-sm font-medium text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3 rounded-lg font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Locking in...' : 'Lock In Predictions'}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
