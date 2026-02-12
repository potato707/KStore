'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Wifi } from 'lucide-react';
import { getUnsyncedItems } from '@/lib/hooks/use-offline-sync';

export function SyncIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial online status
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const checkPending = async () => {
      const unsyncedItems = await getUnsyncedItems();
      setPendingCount(unsyncedItems.length);
      
      if (unsyncedItems.length > 0) {
        setShowMessage(true);
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const unsyncedItems = await getUnsyncedItems();
      setPendingCount(unsyncedItems.length);
      setIsSyncing(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`
        rounded-lg shadow-lg p-4 border
        ${isSyncing 
          ? 'bg-blue-50 border-blue-200' 
          : 'bg-amber-50 border-amber-200'
        }
      `}>
        <div className="flex items-center gap-3">
          {isSyncing ? (
            <>
              <Wifi className="w-5 h-5 text-blue-600 animate-pulse" />
              <div>
                <p className="font-medium text-blue-900">جاري المزامنة...</p>
                <p className="text-sm text-blue-700">يتم إرسال {pendingCount} عنصر</p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">في انتظار المزامنة</p>
                <p className="text-sm text-amber-700">{pendingCount} عنصر قيد المزامنة</p>
              </div>
            </>
          )}
        </div>
        
        {!isOnline && (
          <p className="text-xs text-amber-600 mt-2">
            💡 النت قافل - ستتم المزامنة عند العودة للإنترنت
          </p>
        )}
        
        {isSyncing && (
          <div className="w-full h-1 bg-blue-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-blue-600 animate-pulse"></div>
          </div>
        )}
      </div>
    </div>
  );
}
