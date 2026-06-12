'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NavbarAuth({ isLoggedIn, userRole }: { isLoggedIn: boolean, userRole?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    // Attempting to hit an api/auth/logout endpoint if it exists, or just clearing cookies client side
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    document.cookie = 'auth_token=; Max-Age=0; path=/;';
    router.push('/login');
    router.refresh();
  };

  if (isLoggedIn) {
    return (
      <div className="flex items-center space-x-4">
        {userRole === 'ADMIN' && (
          <Link href="/admin" className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors">Admin Portal</Link>
        )}
        <button onClick={handleLogout} className="text-sm font-medium px-4 py-2 rounded-md bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 transition-all border border-rose-500/30">
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Log In</Link>
      <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
        Sign Up
      </Link>
    </div>
  );
}
