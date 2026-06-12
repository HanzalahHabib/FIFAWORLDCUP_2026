import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import NavbarAuth from '@/components/NavbarAuth';
import PollsModal from '@/components/PollsModal';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pick\'em FIFA World Cup 2026',
  description: 'Predict match outcomes and compete in the ultimate FIFA World Cup 2026 prediction pool.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let isLoggedIn = false;
  let userRole = 'USER';
  
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      isLoggedIn = true;
      userRole = payload.role as string;
    }
  }

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0a0a0f] text-slate-200 selection:bg-primary/30`}>
        {/* Animated Background Overlay */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0a0a0f] to-[#0a0a0f]"></div>

        {/* Top Navigation */}
        <nav className="border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                  Pick'em WC26
                </Link>
                <div className="hidden md:flex space-x-4">
                  <Link href="/matches" className="text-sm text-slate-300 hover:text-white transition-colors">Matches</Link>
                  <Link href="/leaderboard" className="text-sm text-slate-300 hover:text-white transition-colors">Leaderboard</Link>
                  <Link href="/analytics" className="text-sm text-slate-300 hover:text-white transition-colors">US vs PK</Link>
                </div>
              </div>
              <NavbarAuth isLoggedIn={isLoggedIn} userRole={userRole} />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        {isLoggedIn && <PollsModal />}
      </body>
    </html>
  );
}
