'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap } from 'lucide-react';

type AnalyticsData = {
  usTeam: { totalUsers: number, averagePoints: number, accuracyPercent: number };
  pkTeam: { totalUsers: number, averagePoints: number, accuracyPercent: number };
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.analytics);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      }
    }
    fetchAnalytics();
  }, []);

  if (!data) {
    return <div className="flex justify-center items-center h-[50vh]"><div className="animate-pulse flex items-center space-x-2 text-indigo-400"><Activity className="animate-spin" /><span>Loading Analytics Engine...</span></div></div>;
  }

  // Calculate widths for the gauge
  const totalAccuracy = data.usTeam.accuracyPercent + data.pkTeam.accuracyPercent;
  const usWidth = totalAccuracy === 0 ? 50 : (data.usTeam.accuracyPercent / totalAccuracy) * 100;
  const pkWidth = 100 - usWidth;

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-white flex justify-center items-center gap-3">
          <Zap className="text-yellow-400" /> Cross-Cohort Tracker
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto">Real-time aggregate performance analytics comparing US Team vs PK Team accuracy.</p>
      </div>

      <div className="glass-panel p-8 rounded-2xl max-w-4xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-center mb-8">Accuracy Gauge</h2>
        
        <div className="relative h-12 w-full bg-slate-800 rounded-full overflow-hidden flex border border-white/10 shadow-inner">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${usWidth}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 flex items-center justify-start px-4"
          >
            <span className="font-bold text-white text-sm shadow-black drop-shadow-md">US Team</span>
          </motion.div>
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${pkWidth}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 flex items-center justify-end px-4"
          >
            <span className="font-bold text-white text-sm shadow-black drop-shadow-md">PK Team</span>
          </motion.div>
        </div>

        <div className="flex justify-between text-lg font-bold">
          <div className="text-indigo-400">{data.usTeam.accuracyPercent.toFixed(1)}% Accuracy</div>
          <div className="text-emerald-400">{data.pkTeam.accuracyPercent.toFixed(1)}% Accuracy</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="glass-panel p-6 rounded-2xl space-y-4 border-t-4 border-t-indigo-500">
          <h3 className="text-xl font-bold text-white">US Team Stats</h3>
          <div className="space-y-2 text-slate-300">
            <p className="flex justify-between"><span>Registered Users:</span> <span className="font-mono text-white">{data.usTeam.totalUsers}</span></p>
            <p className="flex justify-between"><span>Average Points:</span> <span className="font-mono text-white">{data.usTeam.averagePoints.toFixed(2)}</span></p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-4 border-t-4 border-t-emerald-500">
          <h3 className="text-xl font-bold text-white">PK Team Stats</h3>
          <div className="space-y-2 text-slate-300">
            <p className="flex justify-between"><span>Registered Users:</span> <span className="font-mono text-white">{data.pkTeam.totalUsers}</span></p>
            <p className="flex justify-between"><span>Average Points:</span> <span className="font-mono text-white">{data.pkTeam.averagePoints.toFixed(2)}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
