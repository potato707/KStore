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

    console.log('✅ تم حفظ قيد المزامنة:', pendingItem.type, pendingItem.action);
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

// Get unsynced items sorted by timestamp
export async function getUnsyncedItems(): Promise<PendingItem[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const allItems = request.result;
        const unsynced = allItems
          .filter((item: PendingItem) => !item.synced)
          .sort((a: PendingItem, b: PendingItem) => a.timestamp - b.timestamp);
        resolve(unsynced);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في جلب العناصر غير المتزامنة:', error);
    return [];
  }
}

// Delete pending item (after successful sync)
export async function deletePendingItem(id: string) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في حذف قيد المزامنة:', error);
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
        }
        resolve(item);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('❌ خطأ في وضع علامة متزامن:', error);
  }
}

// Clear all synced items (cleanup)
export async function clearSyncedItems() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result;
        for (const item of items) {
          if (item.synced) {
            store.delete(item.id);
          }
        }
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في تنظيف العناصر:', error);
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
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ خطأ في حذف العناصر:', error);
  }
}

// Sync a single pending item to the server
async function syncItem(item: PendingItem): Promise<boolean> {
  try {
    if (item.type === 'product') {
      if (item.action === 'create') {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        return response.ok;
      }

      if (item.action === 'update') {
        const { id, ...updates } = item.data;
        // Skip updates for offline-created products (they don't exist on server)
        if (id?.startsWith('offline_')) return true;
        const response = await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        return response.ok;
      }

      if (item.action === 'delete') {
        // Skip deletes for offline-created products
        if (item.data.id?.startsWith('offline_')) return true;
        const response = await fetch(`/api/products?id=${item.data.id}`, {
          method: 'DELETE',
        });
        return response.ok;
      }
    }

    if (item.type === 'invoice') {
      if (item.action === 'create') {
        // For invoice creation, we send the invoice data
        // Stock was already updated by product updates in the pending queue
        const invoiceData = item.data.invoice || item.data;
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceData),
        });
        return response.ok;
      }

      if (item.action === 'delete') {
        // Check if this is a return operation
        if (item.data.isReturn) {
          const response = await fetch(`/api/invoices?id=${item.data.id}&action=return`, {
            method: 'PATCH',
          });
          return response.ok;
        }

        // Regular delete
        if (item.data.id?.startsWith('offline_')) return true;
        const response = await fetch(`/api/invoices?id=${item.data.id}`, {
          method: 'DELETE',
        });
        return response.ok;
      }
    }

    return false;
  } catch (error) {
    console.error(`❌ خطأ في مزامنة ${item.type}/${item.action}:`, error);
    return false;
  }
}

// Hook to sync pending items when online
export function useOfflineSync() {
  const syncPending = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    const unsyncedItems = await getUnsyncedItems();

    if (unsyncedItems.length === 0) {
      return;
    }

    console.log(`🔄 جاري مزامنة ${unsyncedItems.length} عنصر...`);
    let syncedCount = 0;

    for (const item of unsyncedItems) {
      const success = await syncItem(item);

      if (success) {
        // Delete successfully synced items instead of just marking
        await deletePendingItem(item.id);
        syncedCount++;
        console.log(`✅ تمت مزامنة: ${item.type}/${item.action}`);
      } else {
        console.error(`❌ فشل في مزامنة: ${item.type}/${item.action}`);
        // Stop syncing if one fails - items depend on order
        break;
      }
    }

    if (syncedCount > 0) {
      console.log(`✅ تمت مزامنة ${syncedCount} عنصر`);

      // Reload fresh data from server after sync
      try {
        // Dynamically import to avoid circular dependency
        const { useGlobalStore } = await import('@/lib/stores/global-store');
        const loadData = useGlobalStore.getState().loadData;
        await loadData();
        console.log('✅ تم تحديث البيانات من السيرفر');
      } catch (e) {
        console.error('❌ فشل في تحديث البيانات بعد المزامنة:', e);
      }
    }

    // Clean up old synced items
    await clearSyncedItems();
  }, []);

  useEffect(() => {
    // Listen for online event
    const handleOnline = () => {
      console.log('🌐 النت رجع - جاري المزامنة...');
      // Small delay to ensure connection is stable
      setTimeout(syncPending, 2000);
    };

    window.addEventListener('online', handleOnline);

    // Try to sync when hook mounts if online
    if (navigator.onLine) {
      syncPending();
    }

    // Also try to sync periodically (every 30 seconds)
    const interval = setInterval(() => {
      if (navigator.onLine) {
        syncPending();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [syncPending]);

  return { syncPending };
}
