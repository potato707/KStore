'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card, CardContent } from '@/components/common/Card';

export default function ClearCachePage() {
  const [status, setStatus] = useState<'clearing' | 'done'>('clearing');
  const [clearedItems, setClearedItems] = useState<string[]>([]);

  useEffect(() => {
    clearEverything();
  }, []);

  const clearEverything = async () => {
    const cleared: string[] = [];

    try {
      // 1. Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      cleared.push('✅ تم مسح جميع الـ Cookies');

      // 2. Clear localStorage
      localStorage.clear();
      cleared.push('✅ تم مسح الـ LocalStorage');

      // 3. Clear sessionStorage
      sessionStorage.clear();
      cleared.push('✅ تم مسح الـ SessionStorage');

      // 4. Clear IndexedDB
      if ('indexedDB' in window) {
        const dbs = await indexedDB.databases();
        for (const db of dbs) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
        cleared.push('✅ تم مسح الـ IndexedDB');
      }

      // 5. Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        cleared.push('✅ تم إزالة الـ Service Workers');
      }

      // 6. Clear cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        cleared.push('✅ تم مسح الـ Cache Storage');
      }

      setClearedItems(cleared);
      setStatus('done');

    } catch (error) {
      console.error('Error clearing cache:', error);
      cleared.push('⚠️ حدث خطأ أثناء المسح');
      setClearedItems(cleared);
      setStatus('done');
    }
  };

  const handleReload = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-gray-200 shadow-lg">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            {status === 'clearing' ? (
              <>
                <RefreshCw className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  جاري التنظيف...
                </h1>
                <p className="text-gray-600">
                  يتم مسح جميع البيانات المؤقتة
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  تم التنظيف بنجاح! ✨
                </h1>
                <p className="text-gray-600 mb-6">
                  تم مسح جميع البيانات المؤقتة والـ Cache
                </p>
              </>
            )}
          </div>

          {clearedItems.length > 0 && (
            <div className="space-y-2 mb-6">
              {clearedItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 text-right animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}

          {status === 'done' && (
            <div className="space-y-3">
              <Button
                onClick={handleReload}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                تحديث الصفحة والدخول للموقع
              </Button>

              <Button
                onClick={clearEverything}
                variant="ghost"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 ml-2" />
                إعادة المسح مرة أخرى
              </Button>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 text-center leading-relaxed">
              💡 بعد الضغط على "تحديث الصفحة" سيتم تحميل الموقع من جديد بدون أي بيانات مخزنة
            </p>
          </div>
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
