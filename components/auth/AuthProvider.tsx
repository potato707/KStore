'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LoginScreen } from './LoginScreen';

interface AuthContextType {
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export const TOKEN_KEY = 'kstore_auth_token';
export const HAS_PASSWORD_KEY = 'kstore_has_password';
export const CACHED_HASH_KEY = 'kstore_cached_hash';

// Client-side SHA256 using Web Crypto API (same algorithm as server)
const PASSWORD_SALT = 'kstore-default-salt';
const TOKEN_SECRET = 'kstore-token-2026';

export async function clientSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function clientHashPassword(password: string): Promise<string> {
  return clientSha256(password + PASSWORD_SALT);
}

export async function clientGenerateToken(passwordHash: string): Promise<string> {
  return clientSha256(passwordHash + TOKEN_SECRET);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'login' | 'setup' | 'authenticated'>('loading');

  const validateToken = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const cachedHash = localStorage.getItem(CACHED_HASH_KEY);
    const cachedHasPassword = localStorage.getItem(HAS_PASSWORD_KEY);

    // If token exists, verify it against cached hash first (instant, no network)
    if (token && cachedHash) {
      try {
        const expectedToken = await clientGenerateToken(cachedHash);
        if (token === expectedToken) {
          // Token is valid - authenticate immediately
          setStatus('authenticated');
          // Try online validation in background (non-blocking)
          tryOnlineRefresh(token);
          return;
        }
      } catch {}
      // Token doesn't match cached hash - password was changed, clear and continue
      localStorage.removeItem(TOKEN_KEY);
    } else if (token) {
      // Token exists but no cached hash - trust it (legacy login before hash caching)
      setStatus('authenticated');
      tryOnlineRefresh(token);
      return;
    }

    // No valid token - need to determine if login or setup
    try {
      const checkRes = await fetch('/api/auth?action=check');
      if (!checkRes.ok) throw new Error('offline');
      const checkData = await checkRes.json();
      if (checkData.error) throw new Error('offline');

      // Cache the result
      localStorage.setItem(HAS_PASSWORD_KEY, checkData.hasPassword ? 'true' : 'false');

      if (!checkData.hasPassword) {
        setStatus('setup');
      } else {
        setStatus('login');
      }
    } catch {
      // OFFLINE - use cached state to decide
      if (cachedHash || cachedHasPassword === 'true') {
        // Password was set before - show login (offline-capable if hash cached)
        setStatus('login');
      } else if (cachedHasPassword === 'false') {
        // No password ever set - need online to setup
        setStatus('setup');
      } else {
        // No cache at all - show login as safe default
        setStatus('login');
      }
    }
  }, []);

  // Non-blocking background validation when online
  const tryOnlineRefresh = async (token: string) => {
    try {
      const res = await fetch(`/api/auth?action=validate&token=${token}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.error) return;
      if (!data.valid) {
        // Token invalidated server-side (password changed)
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(CACHED_HASH_KEY);
        setStatus('login');
      }
    } catch {
      // Offline - ignore
    }
  };

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(HAS_PASSWORD_KEY, 'true');
    setStatus('authenticated');
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setStatus('login');
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Login or Setup screen
  if (status === 'login' || status === 'setup') {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        isFirstTime={status === 'setup'}
      />
    );
  }

  // Authenticated
  return (
    <AuthContext.Provider value={{ isAuthenticated: true, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
