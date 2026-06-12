'use client';

import { useState, useEffect } from 'react';

export default function PollsModal() {
  const [polls, setPolls] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [currentPollIndex, setCurrentPollIndex] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = document.cookie.includes('auth_token');
    if (!token) return;

    const fetchPolls = async () => {
      try {
        const res = await fetch('/api/polls');
        if (res.ok) {
          const data = await res.json();
          if (data.polls && data.polls.length > 0) {
            setPolls(data.polls);
            setTeams(data.teams || []);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch polls', err);
      }
    };

    fetchPolls();
  }, []);

  if (!isOpen || polls.length === 0) return null;

  const currentPoll = polls[currentPollIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      alert('Please select a team');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: currentPoll.id, teamId: selectedTeamId }),
      });

      if (res.ok) {
        // Move to next poll or close
        if (currentPollIndex < polls.length - 1) {
          setCurrentPollIndex(prev => prev + 1);
          setSelectedTeamId('');
        } else {
          setIsOpen(false);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit vote');
      }
    } catch (err) {
      alert('Error submitting vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentPollIndex < polls.length - 1) {
      setCurrentPollIndex(prev => prev + 1);
      setSelectedTeamId('');
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-indigo-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Special Question {currentPollIndex + 1}/{polls.length}
            </h2>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          <p className="text-slate-300 text-lg font-bold">{currentPoll.question}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Select Your Answer</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white appearance-none focus:outline-none focus:border-indigo-500 transition-colors"
              required
            >
              <option value="" disabled>Choose a team...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedTeamId}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Submit Answer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
