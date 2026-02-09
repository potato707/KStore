'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Key, Eye, EyeOff, Check, X, LogOut } from 'lucide-react';
import { hasPassword, setPassword, verifyPassword } from '@/lib/supabase/auth';
import { setAuthCookie, removeAuthCookie } from './actions';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'checking' | 'setup' | 'login'>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if password exists
  useEffect(() => {
    hasPassword().then((has) => {
      setMode(has ? 'login' : 'setup');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'setup') {
        // Setup mode - create new password
        if (password.length < 4) {
          setError('الباسورد لازم يكون 4 حروف على الأقل');
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('الباسورد مش متطابق!');
          setLoading(false);
          return;
        }

        await setPassword(password);
        // Set cookie and redirect
        await setAuthCookie();
        router.push('/');
      } else {
        // Login mode - verify password
        const isValid = await verifyPassword(password);
        if (isValid) {
          await setAuthCookie();
          router.push('/');
        } else {
          setError('الباسورد غلط!');
        }
      }
    } catch (err: any) {
      setError('حدث خطأ. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await removeAuthCookie();
    localStorage.removeItem('kstore_auth');
    setIsLoggedIn(false);
    setMode('login');
  };

  if (mode === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-200">
        <CardContent className="p-8">
          {/* Logo/Icon */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex justify-center flex-1">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                {mode === 'setup' ? (
                  <Key className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
            </div>
            {isLoggedIn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              KStore
            </h1>
            <p className="text-gray-600">
              {isLoggedIn ? 'تم تسجيل الدخول' : (mode === 'setup' ? 'سجل باسورد جديد' : 'أدخل الباسورد')}
            </p>
          </div>

          {!isLoggedIn && (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password Input */}
                <div className="relative">
                  <Input
                    label={mode === 'setup' ? 'الباسورد الجديد' : 'الباسورد'}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    startIcon={<Lock className="w-4 h-4" />}
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm Password (setup mode only) */}
                {mode === 'setup' && (
                  <div className="relative">
                    <Input
                      label="أكد الباسورد"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      startIcon={<Lock className="w-4 h-4" />}
                      required
                      minLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {/* Password match indicator */}
                    {confirmPassword && (
                      <div className="mt-2 flex items-center gap-2">
                        {password === confirmPassword ? (
                          <>
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-600">متطابق</span>
                          </>
                        ) : (
                          <>
                            <X className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">مش متطابق</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Password strength indicator (setup mode) */}
                {mode === 'setup' && password && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${
                          password.length >= i * 2
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'جاري...' : mode === 'setup' ? 'تسجيل الباسورد' : 'دخول'}
                </Button>
              </form>

              {/* Setup mode info */}
              {mode === 'setup' && (
                <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 text-center">
                    🔐 ده أول استخدام. سجل باسورد لحماية النظام.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              💡 افتح الموقع من نفس الجهاز اللي سجلت عليه
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
