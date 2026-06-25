'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Lock, CheckCircle2, Clock, Trophy } from 'lucide-react';

type CohortData = {
  totalUsers: number;
  totalPoints: number;
  averagePoints: number;
  accuracyPercent: number;
  correctPicks: number;
  gradedPicks: number;
  lockedPicks: number;
};

type AnalyticsData = {
  westSide: CohortData;
  eastSide: CohortData;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [lockedMatchesCount, setLockedMatchesCount] = useState<number>(0);
  const [finishedMatchesCount, setFinishedMatchesCount] = useState<number>(0);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.analytics);
        setLockedMatchesCount(json.lockedMatchesCount ?? 0);
        setFinishedMatchesCount(json.finishedMatchesCount ?? 0);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    }
    fetchAnalytics();
  }, []);

  if (!data) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-pulse flex items-center space-x-2 text-indigo-400">
          <Activity className="animate-spin" />
          <span>Loading Analytics Engine...</span>
        </div>
      </div>
    );
  }

  // ── Accuracy Gauge (locked-match picks) ──────────────────────────────────
  const westAccuracy = data.westSide.accuracyPercent;
  const eastAccuracy = data.eastSide.accuracyPercent;
  const totalAccuracy = westAccuracy + eastAccuracy;

  const westLockedTotal = data.westSide.lockedPicks + data.eastSide.lockedPicks;
  const westByPicks = westLockedTotal > 0
    ? (data.westSide.lockedPicks / westLockedTotal) * 100
    : 50;

  const westAccuracyWidth = totalAccuracy > 0
    ? (westAccuracy / totalAccuracy) * 100
    : westByPicks;
  const eastAccuracyWidth = 100 - westAccuracyWidth;

  const hasGradedData = data.westSide.gradedPicks > 0 || data.eastSide.gradedPicks > 0;
  const hasLockedData = data.westSide.lockedPicks > 0 || data.eastSide.lockedPicks > 0;

  // ── Points Gauge (resolved match points) ─────────────────────────────────
  const westPoints = data.westSide.totalPoints;
  const eastPoints = data.eastSide.totalPoints;
  const totalPoints = westPoints + eastPoints;

  const westPointsWidth = totalPoints > 0 ? (westPoints / totalPoints) * 100 : 50;
  const eastPointsWidth = 100 - westPointsWidth;
  const hasPointsData = totalPoints > 0;

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex justify-center items-center gap-3">
          <Zap className="text-yellow-400" /> Cross-Cohort Tracker
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Real-time aggregate performance analytics comparing West Side vs East Side.
        </p>
        <div className="flex justify-center gap-4 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-white/10 rounded-full px-3 py-1 text-xs text-slate-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span><span className="text-amber-400 font-bold">{lockedMatchesCount}</span> matches locked (past kickoff)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/60 border border-white/10 rounded-full px-3 py-1 text-xs text-slate-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span><span className="text-emerald-400 font-bold">{finishedMatchesCount}</span> matches with official scores</span>
          </div>
        </div>
      </div>

      {/* ── GAUGE 1: Pick Accuracy ─────────────────────────────────────────── */}
      <div className="glass-panel p-8 rounded-2xl max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🎯 Pick Accuracy</h2>
          {!hasGradedData && hasLockedData && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              Awaiting official scores — showing pick distribution
            </span>
          )}
          {!hasLockedData && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 border border-white/10 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              No matches locked yet
            </span>
          )}
        </div>

        <div className="relative h-12 w-full bg-slate-800 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${westAccuracyWidth}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 flex items-center justify-start px-4 min-w-[80px]"
          >
            <span className="font-bold text-white text-sm drop-shadow-md">West Side</span>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${eastAccuracyWidth}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 flex items-center justify-end px-4 min-w-[80px]"
          >
            <span className="font-bold text-white text-sm drop-shadow-md">East Side</span>
          </motion.div>
        </div>

        <div className="flex justify-between text-sm font-bold">
          <div className="text-indigo-400 flex flex-col items-start gap-1">
            {hasGradedData ? (
              <>
                <span className="text-lg">{data.westSide.accuracyPercent.toFixed(1)}% Accuracy</span>
                <span className="text-slate-400 font-normal font-mono">
                  {data.westSide.correctPicks} correct / {data.westSide.gradedPicks} graded picks
                </span>
                {data.westSide.lockedPicks > data.westSide.gradedPicks && (
                  <span className="text-amber-500/70 font-normal font-mono text-xs">
                    +{data.westSide.lockedPicks - data.westSide.gradedPicks} pending results
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-lg text-slate-300">{data.westSide.lockedPicks} picks locked in</span>
                <span className="text-slate-500 font-normal text-xs">Accuracy pending scores</span>
              </>
            )}
          </div>
          <div className="text-emerald-400 flex flex-col items-end gap-1">
            {hasGradedData ? (
              <>
                <span className="text-lg">{data.eastSide.accuracyPercent.toFixed(1)}% Accuracy</span>
                <span className="text-slate-400 font-normal font-mono">
                  {data.eastSide.correctPicks} correct / {data.eastSide.gradedPicks} graded picks
                </span>
                {data.eastSide.lockedPicks > data.eastSide.gradedPicks && (
                  <span className="text-amber-500/70 font-normal font-mono text-xs">
                    +{data.eastSide.lockedPicks - data.eastSide.gradedPicks} pending results
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-lg text-slate-300">{data.eastSide.lockedPicks} picks locked in</span>
                <span className="text-slate-500 font-normal text-xs">Accuracy pending scores</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── GAUGE 2: Total Points ──────────────────────────────────────────── */}
      <div className="glass-panel p-8 rounded-2xl max-w-4xl mx-auto space-y-6 border border-amber-500/10">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Total Points
          </h2>
          {!hasPointsData && (
            <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/50 border border-white/10 px-3 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              No points scored yet
            </span>
          )}
        </div>

        <div className="relative h-12 w-full bg-slate-800 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${westPointsWidth}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-start px-4 min-w-[80px]"
          >
            <span className="font-bold text-white text-sm drop-shadow-md">West Side</span>
          </motion.div>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${eastPointsWidth}%` }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            className="h-full bg-gradient-to-r from-rose-500 to-pink-400 flex items-center justify-end px-4 min-w-[80px]"
          >
            <span className="font-bold text-white text-sm drop-shadow-md">East Side</span>
          </motion.div>
        </div>

        <div className="flex justify-between text-sm font-bold">
          <div className="text-amber-400 flex flex-col items-start gap-1">
            <span className="text-lg">{westPoints} total pts</span>
            <span className="text-slate-400 font-normal font-mono">
              {data.westSide.averagePoints.toFixed(2)} avg · {data.westSide.totalUsers} members
            </span>
          </div>
          <div className="text-rose-400 flex flex-col items-end gap-1">
            <span className="text-lg">{eastPoints} total pts</span>
            <span className="text-slate-400 font-normal font-mono">
              {data.eastSide.averagePoints.toFixed(2)} avg · {data.eastSide.totalUsers} members
            </span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="glass-panel p-6 rounded-2xl space-y-3 border-t-4 border-t-indigo-500">
          <h3 className="text-xl font-bold text-white">West Side Stats</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="flex justify-between">
              <span>Registered Users:</span>
              <span className="font-mono text-white">{data.westSide.totalUsers}</span>
            </p>
            <p className="flex justify-between">
              <span>Total Points:</span>
              <span className="font-mono text-amber-300">{westPoints}</span>
            </p>
            <p className="flex justify-between">
              <span>Average Points:</span>
              <span className="font-mono text-white">{data.westSide.averagePoints.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span>Picks (Locked Matches):</span>
              <span className="font-mono text-amber-300">{data.westSide.lockedPicks}</span>
            </p>
            <p className="flex justify-between">
              <span>Correct / Graded:</span>
              <span className="font-mono text-white">{data.westSide.correctPicks} / {data.westSide.gradedPicks}</span>
            </p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-3 border-t-4 border-t-emerald-500">
          <h3 className="text-xl font-bold text-white">East Side Stats</h3>
          <div className="space-y-2 text-slate-300 text-sm">
            <p className="flex justify-between">
              <span>Registered Users:</span>
              <span className="font-mono text-white">{data.eastSide.totalUsers}</span>
            </p>
            <p className="flex justify-between">
              <span>Total Points:</span>
              <span className="font-mono text-rose-300">{eastPoints}</span>
            </p>
            <p className="flex justify-between">
              <span>Average Points:</span>
              <span className="font-mono text-white">{data.eastSide.averagePoints.toFixed(2)}</span>
            </p>
            <p className="flex justify-between">
              <span>Picks (Locked Matches):</span>
              <span className="font-mono text-amber-300">{data.eastSide.lockedPicks}</span>
            </p>
            <p className="flex justify-between">
              <span>Correct / Graded:</span>
              <span className="font-mono text-white">{data.eastSide.correctPicks} / {data.eastSide.gradedPicks}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
