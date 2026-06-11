'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Users, Activity, ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl space-y-6"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">
          Pick'em FIFA World Cup 2026
        </h1>
        <p className="text-lg md:text-xl text-slate-400 font-medium">
          The ultimate prediction battleground. Choose your cohort, lock in your picks before kickoff, and climb the global leaderboards.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <Link href="/register" className="group relative inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-white transition-all duration-200 bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
          Join the Arena
          <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link href="/leaderboard" className="inline-flex items-center justify-center px-8 py-3.5 text-base font-bold text-slate-300 transition-all duration-200 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white focus:outline-none">
          View Leaderboards
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-12"
      >
        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-4 hover:border-indigo-500/30 transition-colors">
          <div className="p-4 bg-indigo-500/20 rounded-full text-indigo-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Dynamic Scoring</h3>
          <p className="text-slate-400 text-sm">Earn points for correct picks, plus bonuses for Top 4, Unbeaten, and No-Win teams.</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-4 hover:border-purple-500/30 transition-colors">
          <div className="p-4 bg-purple-500/20 rounded-full text-purple-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Cohort Battles</h3>
          <p className="text-slate-400 text-sm">US Team vs PK Team. Track aggregate performance and accuracy in real-time.</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center space-y-4 hover:border-pink-500/30 transition-colors">
          <div className="p-4 bg-pink-500/20 rounded-full text-pink-400">
            <Activity className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Strict Time-Locks</h3>
          <p className="text-slate-400 text-sm">Picks lock exactly at kickoff UTC. No modifications allowed post-game start.</p>
        </div>
      </motion.div>
    </div>
  );
}
