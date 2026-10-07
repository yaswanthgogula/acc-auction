/**
 * ============================================================================
 * ACC AUTHENTICATION CONTEXT & ROLE-BASED ACCESS CONTROL
 * ============================================================================
 * Google Login removed as per Requirement 4.
 * Keeps Player login, Franchise login, Admin/Super Admin login, and OTP capabilities.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'FRANCHISE' | 'PLAYER' | 'PUBLIC';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  franchiseId?: string;
  playerId?: string;
  franchise?: any;
  player?: any;
}

interface AuthContextType {
  user: UserSession | null;
  role: UserRole;
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string, requestedRole?: UserRole) => Promise<{ success: boolean; error?: string; user?: UserSession }>;
  registerAdmin: (username: string, password: string, confirmPassword?: string, email?: string, role?: UserRole) => Promise<{ success: boolean; error?: string; user?: UserSession }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('acc_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('acc_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('acc_auth_user');
    }
  }, [user]);

  const getAuthToken = async (): Promise<string | null> => {
    return token;
  };

  const login = async (username: string, password: string, requestedRole?: UserRole): Promise<{ success: boolean; error?: string; user?: UserSession }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: requestedRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed' };
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const registerAdmin = async (username: string, password: string, confirmPassword?: string, email?: string, role?: UserRole): Promise<{ success: boolean; error?: string; user?: UserSession }> => {
    try {
      const res = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': user?.role || '',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
          email,
          role,
          actorRole: user?.role,
          actorId: user?.id,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || 'Admin registration failed' };
      }
      if (user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN')) {
        return { success: true, user: data.user };
      }
      return await login(username, password, 'ADMIN');
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('acc_auth_user');
  }, []);

  const refreshSession = async () => {
    if (!user) return;
    try {
      if (user.playerId) {
        const res = await fetch(`/api/players`);
        const data = await res.json();
        if (data.success && Array.isArray(data.players)) {
          const freshPlayer = data.players.find((p: any) => p.id === user.playerId || p.roll_number?.toUpperCase() === user.username?.toUpperCase());
          if (freshPlayer) {
            setUser((prev) => prev ? { ...prev, player: freshPlayer } : null);
          }
        }
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : 'PUBLIC',
        isAuthenticated: !!user,
        token,
        login,
        registerAdmin,
        logout,
        refreshSession,
        getAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
