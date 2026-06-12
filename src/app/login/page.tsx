'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      router.push('/matches');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto pt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-8 rounded-2xl border border-white/10"
      >
        <h2 className="text-3xl font-bold text-center text-white mb-8">Access Arena</h2>
        
        {/* Error Popup Modal */}
        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-rose-500/50 p-6 rounded-xl max-w-sm w-full text-center space-y-6 shadow-2xl shadow-rose-900/20"
            >
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl text-white font-bold mb-2">Authentication Failed</h3>
                <p className="text-slate-300 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError('')} 
                className="w-full bg-rose-600 text-white font-medium px-4 py-3 rounded-lg hover:bg-rose-500 transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
            <input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          
          <button type="submit" disabled={loading} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
