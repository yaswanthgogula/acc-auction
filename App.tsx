/**
 * ============================================================================
 * ACC PLAYER AUCTION PORTAL — MAIN APPLICATION ROOT & ROUTER
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuctionProvider, useAuction } from './context/AuctionContext';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { LiveAuction } from './pages/LiveAuction';
import { FranchisesList } from './pages/FranchisesList';
import { FranchiseConsole } from './pages/FranchiseConsole';
import { AdminDashboard } from './pages/AdminDashboard';
import { PlayerDashboard } from './pages/PlayerDashboard';
import { PlayerRegister } from './pages/PlayerRegister';
import { PlayersList } from './pages/PlayersList';
import { ProjectorView } from './pages/ProjectorView';
import { LoginModal } from './pages/LoginModal';
import { AuctionNotificationBanner } from './components/AuctionNotificationBanner';

function MainLayout() {
  const { user } = useAuth();
  const { currentLot } = useAuction();
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalTab, setLoginModalTab] = useState<'PLAYER' | 'FRANCHISE' | 'ADMIN'>('PLAYER');

  useEffect(() => {
    const syncRouteFromLocation = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (!hash || hash === 'home') {
        setCurrentRoute('/');
      } else if (hash === 'live' || hash === 'auction') {
        setCurrentRoute('/live');
      } else if (hash === 'franchises') {
        setCurrentRoute('/franchises');
      } else if (hash === 'players') {
        setCurrentRoute('/players');
      } else if (hash === 'franchise' || hash === 'franchise-console') {
        setCurrentRoute('/franchise');
      } else if (hash === 'admin') {
        setCurrentRoute('/admin');
      } else if (hash === 'player/dashboard' || hash === 'player-dashboard' || hash === 'dashboard') {
        setCurrentRoute('/player/dashboard');
      } else if (hash === 'player/register' || hash === 'register') {
        setCurrentRoute('/player/register');
      } else if (hash === 'projector') {
        setCurrentRoute('/projector');
      }
    };

    syncRouteFromLocation();
    window.addEventListener('hashchange', syncRouteFromLocation);
    return () => window.removeEventListener('hashchange', syncRouteFromLocation);
  }, []);

  const handleNavigate = (route: string) => {
    let target = route;
    if (target === '/home') target = '/';
    setCurrentRoute(target);

    const hashTarget = target === '/' ? 'home' : target.replace(/^\//, '');
    window.location.hash = hashTarget;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLogin = (type: 'PLAYER' | 'FRANCHISE' | 'ADMIN' = 'PLAYER') => {
    setLoginModalTab(type);
    setShowLoginModal(true);
  };

  if (currentRoute === '/projector') {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <ProjectorView onExit={() => handleNavigate('/live')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <AuctionNotificationBanner onNavigate={handleNavigate} />

      <Header
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenLogin={handleOpenLogin}
      />

      <main className="flex-1 pb-16">
        {currentRoute === '/' && (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenLogin={handleOpenLogin}
          />
        )}

        {currentRoute === '/live' && (
          <LiveAuction
            onNavigate={handleNavigate}
            onOpenLogin={handleOpenLogin}
          />
        )}

        {currentRoute === '/franchises' && (
          <FranchisesList
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === '/players' && (
          <PlayersList
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === '/franchise' && (
          <FranchiseConsole />
        )}

        {currentRoute === '/admin' && (
          <AdminDashboard />
        )}

        {currentRoute === '/player/dashboard' && (
          <PlayerDashboard
            onNavigate={handleNavigate}
          />
        )}

        {currentRoute === '/player/register' && (
          <PlayerRegister
            onNavigate={handleNavigate}
            onOpenLogin={handleOpenLogin}
          />
        )}
      </main>

      <footer className="border-t border-slate-800/80 bg-slate-950/90 text-xs text-slate-500 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-slate-400">ACC Official Auction Engine v4.2</span>
            <span>•</span>
            <span>Avanthi Cricket Carnival</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400 font-medium">
            <button onClick={() => handleNavigate('/')} className="hover:text-amber-400 transition-colors cursor-pointer">Home</button>
            <button onClick={() => handleNavigate('/live')} className="hover:text-amber-400 transition-colors cursor-pointer">Live Arena</button>
            <button onClick={() => handleNavigate('/franchises')} className="hover:text-amber-400 transition-colors cursor-pointer">Franchises</button>
            <button onClick={() => handleNavigate('/players')} className="hover:text-amber-400 transition-colors cursor-pointer">Players</button>
            <button onClick={() => handleNavigate('/player/register')} className="hover:text-amber-400 transition-colors cursor-pointer">Register</button>
            <button onClick={() => handleNavigate('/projector')} className="hover:text-amber-400 transition-colors cursor-pointer">Auditorium Screen</button>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={showLoginModal}
        defaultTab={loginModalTab}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(role) => {
          setShowLoginModal(false);
          if (role === 'ADMIN' || role === 'SUPER_ADMIN') handleNavigate('/admin');
          else if (role === 'FRANCHISE') handleNavigate('/franchise');
          else if (role === 'PLAYER') handleNavigate('/player/dashboard');
        }}
        onNavigateRegister={() => {
          setShowLoginModal(false);
          handleNavigate('/player/register');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuctionProvider>
        <MainLayout />
      </AuctionProvider>
    </AuthProvider>
  );
}
