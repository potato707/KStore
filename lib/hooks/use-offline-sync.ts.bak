import { useEffect, useCallback } from 'react';

interface PendingItem {
  id: string;
  type: 'product' | 'invoice';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  synced: boolean;
}

// IndexedDB helpers
const DB_NAME = 'KStore_Offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_items';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Add pending item to IndexedDB
export async function addPendingItem(item: Omit<PendingItem, 'id' | 'timestamp'>) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const pendingItem: PendingItem = {
      ...item,
      id: `${item.type}_${item.action}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };
    
    store.add(pendingItem);
    
    console.log('✅ تم حفظ قيد المزامنة:', pendingItem);
    return pendingItem;
  } catch (error) {
    console.error('❌ خطأ في حفظ قيد المزامنة:', error);
    throw error;
  }
}

// Get all pending items
export async function getPendingItems(): Promise<PendingItem[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في جلب قيد المزامنة:', error);
    return [];
  }
}

// Get unsynced items
export async function getUnsyncedItems(): Promise<PendingItem[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const allItems = request.result;
        const unsynced = allItems.filter(item => !item.synced);
        resolve(unsynced);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في جلب العناصر غير المتزامنة:', error);
    return [];
  }
}

// Mark item as synced
export async function markAsSynced(id: string) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          store.put(item);
          console.log('✅ تم وضع علامة متزامن:', id);
        }
        resolve(item);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('❌ خطأ في وضع علامة متزامن:', error);
  }
}

// Delete pending item
export async function deletePendingItem(id: string) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        console.log('✅ تم حذف قيد المزامنة:', id);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في حذف قيد المزامنة:', error);
  }
}

// Clear all pending items
export async function clearAllPendingItems() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => {
        console.log('✅ تم حذف جميع العناصر قيد المزامنة');
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في حذف العناصر:', error);
  }
}

// Hook to sync pending items when online
export function useOfflineSync() {
  const syncPending = useCallback(async () => {
    if (!navigator.onLine) {
      console.log('📡 النت قافل - سيتم المزامنة لاحقاً');
      return;
    }

    console.log('🔄 جاري مزامنة البيانات...');
    const unsyncedItems = await getUnsyncedItems();
    
    if (unsyncedItems.length === 0) {
      console.log('✅ لا توجد بيانات قيد المزامنة');
      return;
    }

    console.log(`📤 جاري إرسال ${unsyncedItems.length} عنصر...`);

    for (const item of unsyncedItems) {
      try {
        const endpoint = `/api/${item.type}s`;
        const method = item.action === 'create' ? 'POST' : item.action === 'update' ? 'PUT' : 'DELETE';
        
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          await markAsSynced(item.id);
          console.log(`✅ تمت مزامنة: ${item.type}`);
        } else {
          console.error(`❌ فشل في مزامنة: ${item.type}`);
        }
      } catch (error) {
        console.error(`❌ خطأ في مزامنة ${item.id}:`, error);
        // سيحاول مجدداً في المرة القادمة
      }
    }

    console.log('✅ انتهت المزامنة');
  }, []);

  useEffect(() => {
    // Listen for online event
    window.addEventListener('online', syncPending);
    
    // Try to sync when hook mounts if online
    if (navigator.onLine) {
      syncPending();
    }

    return () => {
      window.removeEventListener('online', syncPending);
    };
  }, [syncPending]);

  return { syncPending };
}
