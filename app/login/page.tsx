'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { signIn, signUp } from '@/lib/supabase/client';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name);
        if (error) throw error;
        // After signup, try to sign in
        const signInResult = await signIn(email, password);
        if (signInResult.error) throw signInResult.error;
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-200">
        <CardContent className="p-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              KStore
            </h1>
            <p className="text-gray-600">
              {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <Input
                  label="الاسم"
                  placeholder="أدخل اسمك"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isSignUp}
                />
              </div>
            )}

            <div>
              <Input
                label="البريد الإلكتروني"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<Mail className="w-4 h-4" />}
                required
              />
            </div>

            <div>
              <Input
                label="كلمة المرور"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                startIcon={<Lock className="w-4 h-4" />}
                required
                minLength={6}
              />
            </div>

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
              {loading ? 'جاري...' : isSignUp ? 'إنشاء حساب' : 'دخول'}
            </Button>
          </form>

          {/* Toggle Sign In/Up */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignUp
                ? 'لديك حساب بالفعل؟ سجل دخول'
                : 'ليس لديك حساب؟ إنشاء حساب جديد'}
            </button>
          </div>

          {/* Demo Notice */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 text-center">
              💡 للإستخدام التجاري، سجل في{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                supabase.com
              </a>
              {' '}وأنشئ مشروع مجاني
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
