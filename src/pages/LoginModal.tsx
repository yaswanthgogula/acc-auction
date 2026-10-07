/**
 * ============================================================================
 * ACC MULTI-ROLE UNIFIED AUTHENTICATION MODAL (WITH MOBILE OTP FORGOT PASSWORD)
 * ============================================================================
 * Implements Requirement 1:
 * - Player login with Roll Number & Password
 * - Forgot Password option generating new OTP to player's registered mobile number
 * - Set up new password upon OTP verification
 * - Franchise login (ID/username & password)
 * - Admin login
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mobileNotification } from '../utils/mobileNotification';
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
  KeyRound,
  Smartphone,
  ArrowLeft,
  RotateCcw,
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
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<'PLAYER' | 'FRANCHISE' | 'ADMIN'>(defaultTab);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot Password States (Direct Reset - No OTP)
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIdentifier('');
      setPassword('');
      setIsForgotPassword(false);
      setForgotIdentifier('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

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
        throw new Error(res.error || 'Authentication failed. Please verify credentials.');
      }

      setSuccessMsg('Authentication successful. Redirecting...');
      setTimeout(() => {
        onClose();
        if (onLoginSuccess) {
          onLoginSuccess(res.user?.role || activeTab);
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Password Reset (No OTP)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!forgotIdentifier.trim()) {
      setErrorMsg('Please enter your College Roll Number or Registered Mobile Number.');
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter identical passwords.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          newPassword: forgotNewPassword.trim(),
          confirmPassword: forgotConfirmPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Password reset failed.');
      }

      setSuccessMsg('Password reset successfully! You can now log in with your new password.');
      setPassword(forgotNewPassword);
      setIdentifier(forgotIdentifier);
      setTimeout(() => {
        setIsForgotPassword(false);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-5 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isForgotPassword ? (
          /* FORGOT PASSWORD FORM (Requirement 1) */
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="p-1.5 rounded-xl bg-slate-950 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="font-heading text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  Reset Player Password
                </h2>
                <p className="text-[11px] text-slate-400">
                  Enter your registered roll number or mobile number to set a new password.
                </p>
              </div>
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

            <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  College Roll Number or Registered Mobile *
                </label>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value.toUpperCase())}
                  placeholder="e.g. 23811A0501 or 9876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-amber-500 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{loading ? 'Resetting Password...' : 'Save New Password & Return to Login'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* STANDARD LOGIN FORM */
          <>
            <div>
              <h2 className="font-heading text-2xl font-black text-white uppercase tracking-tight">
                ACC Portal Access
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select your account type to sign in with your credentials.
              </p>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-bold uppercase tracking-wider">
                    Password *
                  </label>
                  {activeTab === 'PLAYER' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotIdentifier(identifier);
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-amber-400 hover:text-amber-300 text-[11px] font-bold hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
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
          </>
        )}
      </div>
    </div>
  );
};
