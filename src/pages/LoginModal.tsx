/**
 * ============================================================================
 * ACC MULTI-ROLE UNIFIED AUTHENTICATION MODAL
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  Award,
  Crown,
  User,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  CheckCircle,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'PLAYER' | 'FRANCHISE' | 'ADMIN';
  onLoginSuccess?: (role: string) => void;
  onNavigateRegister?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'ADMIN',
  onLoginSuccess,
  onNavigateRegister,
}) => {
  const { login, signInWithGoogle } = useAuth();
  const [activeTab, setActiveTab] = useState<'PLAYER' | 'FRANCHISE' | 'ADMIN'>(defaultTab);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIdentifier('');
      setPassword('');
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        throw new Error(res.error || 'Google Sign-In failed');
      }
      onClose();
      if (onLoginSuccess) {
        onLoginSuccess(res.user?.role || 'SUPER_ADMIN');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setErrorMsg(activeTab === 'ADMIN' ? 'Username is required.' : activeTab === 'PLAYER' ? 'Roll number is required.' : 'Franchise ID or Username is required.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Password is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(identifier.trim(), password.trim(), activeTab);
      if (!res.success) {
        throw new Error(res.error || 'Authentication failed');
      }

      onClose();
      if (onLoginSuccess) {
        onLoginSuccess(res.user?.role || activeTab);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h2 className="font-heading text-2xl font-black text-white uppercase tracking-tight">
            ACC Portal Access
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select your account type or sign in with your credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer border border-slate-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google / Quick Access</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-widest font-mono shrink-0">
            or credentials login
          </span>
          <div className="border-t border-slate-800 w-full"></div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ADMIN');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ADMIN'
                ? 'bg-purple-600 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Admin
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('FRANCHISE');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'FRANCHISE'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Franchise
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('PLAYER');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'PLAYER'
                ? 'bg-blue-600 text-white font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Player
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              {activeTab === 'ADMIN'
                ? 'Admin Username *'
                : activeTab === 'FRANCHISE'
                ? 'Franchise ID or Username *'
                : 'College Roll Number *'}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={
                activeTab === 'ADMIN'
                  ? 'e.g. admin or superadmin'
                  : activeTab === 'FRANCHISE'
                  ? 'e.g. FR-7491 or team_1'
                  : 'e.g. 23811A0501'
              }
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500 transition pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {activeTab === 'FRANCHISE' && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              💡 Franchise credentials (Franchise ID & password) are generated by the Tournament Administrator in the Admin Dashboard.
            </div>
          )}

          {activeTab === 'ADMIN' && (
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300 leading-relaxed">
              🔒 Administrator accounts are issued and managed exclusively by current Tournament Administrators.
            </div>
          )}

          {activeTab === 'PLAYER' && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Not registered yet?</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onNavigateRegister) onNavigateRegister();
                }}
                className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
              >
                Register Player Dossier →
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-2 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
              activeTab === 'FRANCHISE'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/50'
                : activeTab === 'ADMIN'
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50'
            }`}
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Processing...' : `Log In as ${activeTab}`}
          </button>
        </form>
      </div>
    </div>
  );
};
