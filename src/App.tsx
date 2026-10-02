/**
 * ============================================================================
 * AVANTHI CRICKET CARNIVAL (ACC) OFFICIAL PLAYER AUCTION APPLICATION
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuctionProvider } from './context/AuctionContext';
import { Header } from './components/Header';
import { AuctionNotificationBanner } from './components/AuctionNotificationBanner';
import { LandingPage } from './pages/LandingPage';
import { LiveAuction } from './pages/LiveAuction';
import { ProjectorView } from './pages/ProjectorView';
import { AdminDashboard } from './pages/AdminDashboard';
import { FranchiseConsole } from './pages/FranchiseConsole';
import { PlayerRegister } from './pages/PlayerRegister';
import { PlayerDashboard } from './pages/PlayerDashboard';
import { PlayersList } from './pages/PlayersList';
import { FranchisesList } from './pages/FranchisesList';
import { LoginModal } from './pages/LoginModal';

function AppContent() {
  const { user } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<'PLAYER' | 'FRANCHISE' | 'ADMIN'>('FRANCHISE');

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = (type: 'PLAYER' | 'FRANCHISE' | 'ADMIN' = 'FRANCHISE') => {
    setLoginModalTab(type);
    setLoginModalOpen(true);
  };

  const handleLoginSuccess = (role: string) => {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'OPERATOR') {
      navigate('/admin');
    } else if (role === 'FRANCHISE') {
      navigate('/franchise');
    } else if (role === 'PLAYER') {
      navigate('/player/dashboard');
    }
  };

  if (currentRoute === '/projector') {
    return <ProjectorView onExit={() => navigate('/live')} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <AuctionNotificationBanner onNavigate={navigate} />

      <Header
        currentRoute={currentRoute}
        onNavigate={navigate}
        onOpenLogin={handleOpenLogin}
      />

      <main className="flex-1 flex flex-col">
        {currentRoute === '/' && (
          <LandingPage onNavigate={navigate} onOpenLogin={handleOpenLogin} />
        )}
        {currentRoute === '/live' && (
          <LiveAuction onNavigate={navigate} onOpenLogin={handleOpenLogin} />
        )}
        {currentRoute === '/admin' && <AdminDashboard />}
        {currentRoute === '/franchise' && <FranchiseConsole />}
        {currentRoute === '/player/register' && (
          <PlayerRegister onNavigate={navigate} onOpenLogin={handleOpenLogin} />
        )}
        {currentRoute === '/player/dashboard' && (
          <PlayerDashboard onNavigate={navigate} />
        )}
        {currentRoute === '/players' && <PlayersList onNavigate={navigate} />}
        {currentRoute === '/franchises' && (
          <FranchisesList onNavigate={navigate} />
        )}
      </main>

      <footer className="w-full bg-slate-950 border-t border-slate-900 py-8 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="font-bold text-slate-400 font-heading">
              Avanthi Cricket Carnival (ACC) 2026
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Avanthi Institute of Engineering & Technology</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => navigate('/live')}
              className="hover:text-amber-400 transition cursor-pointer"
            >
              Live Arena
            </button>
            <button
              onClick={() => navigate('/players')}
              className="hover:text-amber-400 transition cursor-pointer"
            >
              Players
            </button>
            <button
              onClick={() => navigate('/franchises')}
              className="hover:text-amber-400 transition cursor-pointer"
            >
              Franchises
            </button>
            <button
              onClick={() => handleOpenLogin('ADMIN')}
              className="hover:text-purple-400 transition cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        defaultTab={loginModalTab}
        onLoginSuccess={handleLoginSuccess}
        onNavigateRegister={() => navigate('/player/register')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuctionProvider>
        <AppContent />
      </AuctionProvider>
    </AuthProvider>
  );
}
