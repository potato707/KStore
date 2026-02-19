'use client';

import { useState } from 'react';
import { Package, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import {
  TOKEN_KEY,
  HAS_PASSWORD_KEY,
  CACHED_HASH_KEY,
  clientHashPassword,
  clientGenerateToken,
} from './AuthProvider';

interface LoginScreenProps {
  onLoginSuccess: (token: string) => void;
  isFirstTime: boolean;
}

export function LoginScreen({ onLoginSuccess, isFirstTime }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Try offline login using cached password hash
  const tryOfflineLogin = async (): Promise<boolean> => {
    const cachedHash = localStorage.getItem(CACHED_HASH_KEY);
    if (!cachedHash) return false; // No cached hash, can't verify offline

    try {
      const inputHash = await clientHashPassword(password);
      if (inputHash === cachedHash) {
        // Password matches! Generate token locally
        const token = await clientGenerateToken(cachedHash);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(HAS_PASSWORD_KEY, 'true');
        onLoginSuccess(token);
        return true;
      } else {
        setError('كلمة السر غلط');
        return true; // Handled (wrong password), don't show connection error
      }
    } catch {
      return false; // Crypto failed, fall through
    }
  };

  const handleLogin = async () => {
    if (!password) {
      setError('ادخل كلمة السر');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', password }),
      });

      const data = await res.json();

      if (data.valid && data.token) {
        // Online login success - also cache the password hash for offline use
        try {
          const hash = await clientHashPassword(password);
          localStorage.setItem(CACHED_HASH_KEY, hash);
        } catch {}
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'كلمة السر غلط');
      }
    } catch {
      // Online login failed - try offline verification
      const handled = await tryOfflineLogin();
      if (!handled) {
        setError('مفيش اتصال بالسيرفر. سجل دخول مرة وانت اونلاين الأول عشان تقدر تدخل اوفلاين');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    if (!password) {
      setError('ادخل كلمة السر');
      return;
    }
    if (password.length < 4) {
      setError('كلمة السر لازم تكون 4 حروف على الأقل');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمة السر مش متطابقة');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup', password }),
      });

      const data = await res.json();

      if (data.success && data.token) {
        // Cache hash for offline login
        try {
          const hash = await clientHashPassword(password);
          localStorage.setItem(CACHED_HASH_KEY, hash);
        } catch {}
        onLoginSuccess(data.token);
      } else {
        setError(data.error || 'حصل خطأ');
      }
    } catch {
      setError('إنشاء كلمة السر يحتاج اتصال بالسيرفر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFirstTime) {
      handleSetup();
    } else {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">KStore</h1>
          <p className="text-sm text-gray-500 mt-1">نظام إدارة المخزون والمبيعات</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-gray-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">
              {isFirstTime ? 'إنشاء كلمة سر' : 'تسجيل الدخول'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isFirstTime
                ? 'اختار كلمة سر لحماية النظام'
                : 'ادخل كلمة السر للدخول'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                كلمة السر
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isFirstTime) handleLogin();
                  }}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 text-base border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  autoFocus
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (first time only) */}
            {isFirstTime && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  تأكيد كلمة السر
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 text-base border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors"
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isFirstTime ? 'إنشاء وتسجيل الدخول' : 'دخول'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          KStore © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
