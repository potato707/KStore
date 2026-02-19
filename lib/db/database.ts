// Client-side database API wrapper - LOCAL-FIRST
// Pattern: Save to Zustand state (→ localStorage) FIRST, then try API.
// If API fails, data is already safe locally + queued for sync.
import { Product, Invoice, Expense } from './schema';
import { addPendingItem } from '@/lib/hooks/use-offline-sync';

const API_BASE = '/api';

// Helper to generate IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper to check if we're offline or request failed
function isOfflineOrFailed(error: unknown): boolean {
  // Navigator says offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  // Fetch TypeError (network error)
  if (error instanceof TypeError) return true;
  // DOMException abort
  if (error instanceof DOMException) return true;
  // Any error message with common offline keywords
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('offline') || msg.includes('failed')) return true;
  }
  return false;
}

// Helper to get cached products from Zustand localStorage
function getCachedProducts(): Product[] {
  try {
    const stored = localStorage.getItem('kstore-global');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.products || [];
    }
  } catch {}
  return [];
}

// Helper to get cached invoices from Zustand localStorage
function getCachedInvoices(): Invoice[] {
  try {
    const stored = localStorage.getItem('kstore-global');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.invoices || [];
    }
  } catch {}
  return [];
}

// ==================== PRODUCTS ====================

export async function getAllProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE}/products`);
    if (!response.ok) throw new Error('Failed to fetch products');
    const data = await response.json();
    // Validate: if server returned error object or empty when we have cache, use cache
    if (data && data.error) throw new Error(data.error);
    if (Array.isArray(data)) return data;
    throw new Error('Invalid response');
  } catch (error) {
    console.log('📦 أوفلاين - جاري تحميل المنتجات من الكاش');
    return getCachedProducts();
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_BASE}/products?id=${id}`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    const products = getCachedProducts();
    return products.find(p => p.id === id) || null;
  }
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const products = await getAllProducts();
  return products.find((p) => p.barcode === barcode) || null;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product | null> {
  // Just try the API - the store handles local-first saving
  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.error) return null;
    return data;
  } catch {
    return null; // API failed - store already saved locally
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  // Just try the API - the store handles local-first saving
  try {
    if (id.startsWith('offline_')) return true; // Can't update on server, will sync later
    const response = await fetch(`${API_BASE}/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch {
    return false; // API failed - store already saved locally
  }
}

export async function updateProductStock(
  id: string,
  quantityChange: number
): Promise<boolean> {
  const product = await getProductById(id);
  if (!product) return false;

  return updateProduct(id, {
    stock: product.stock + quantityChange,
  });
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    if (id.startsWith('offline_')) return true; // Not on server
    const response = await fetch(`${API_BASE}/products?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch {
    return false;
  }
}

export async function searchProducts(query: string): Promise<Product[]> {
  const products = await getAllProducts();
  const lowerQuery = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.barcode?.toLowerCase().includes(lowerQuery) ||
      p.category?.toLowerCase().includes(lowerQuery)
  );
}

// ==================== INVOICES ====================

export async function getAllInvoices(): Promise<Invoice[]> {
  try {
    const response = await fetch(`${API_BASE}/invoices`);
    if (!response.ok) throw new Error('Failed to fetch invoices');
    const data = await response.json();
    if (data && data.error) throw new Error(data.error);
    if (Array.isArray(data)) return data;
    throw new Error('Invalid response');
  } catch (error) {
    console.log('📦 أوفلاين - جاري تحميل الفواتير من الكاش');
    return getCachedInvoices();
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  try {
    const invoices = await getAllInvoices();
    return invoices.find((inv) => inv.id === id) || null;
  } catch {
    const invoices = getCachedInvoices();
    return invoices.find((inv) => inv.id === id) || null;
  }
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
): Promise<Invoice | null> {
  // Just try the API - the store handles local-first saving + stock updates
  // Server-side createInvoice also updates product stock
  try {
    const response = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });

    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function updateInvoicePayment(
  id: string,
  paidAmount: number
): Promise<boolean> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return false;

  const newPaidAmount = invoice.paidAmount + paidAmount;
  const remainingBalance = invoice.total - newPaidAmount;
  const status =
    remainingBalance <= 0 ? 'paid' : remainingBalance < invoice.total ? 'partial' : 'unpaid';

  // Note: We would need an update endpoint for invoices
  return false;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  // Get invoice to restore stock
  const invoice = await getInvoiceById(id);
  if (invoice) {
    for (const item of invoice.items) {
      await updateProductStock(item.productId, item.quantity);
    }
  }

  try {
    const response = await fetch(`${API_BASE}/invoices?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch (error) {
    if (isOfflineOrFailed(error)) {
      if (!id.startsWith('offline_')) {
        await addPendingItem({
          type: 'invoice',
          action: 'delete',
          data: { id },
          synced: false,
        });
      }

      console.log('📦 أوفلاين - تم حذف الفاتورة محلياً');
      return true;
    }
    return false;
  }
}

export async function returnInvoice(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/invoices?id=${id}&action=return`, {
      method: 'PATCH',
    });

    if (!response.ok) throw new Error('Failed to return invoice');
    const result = await response.json();
    return result.success;
  } catch (error) {
    if (isOfflineOrFailed(error)) {
      if (!id.startsWith('offline_')) {
        await addPendingItem({
          type: 'invoice',
          action: 'delete',
          data: { id, isReturn: true },
          synced: false,
        });
      }

      console.log('📦 أوفلاين - تم ترجيع الفاتورة محلياً');
      return true;
    }
    return false;
  }
}

// ==================== STATS ====================

export async function getTodaySalesStats() {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) return calcLocalStats();
    return response.json();
  } catch {
    return calcLocalStats();
  }
}

function calcLocalStats() {
  const invoices = getCachedInvoices();
  const today = new Date().toISOString().split('T')[0];
  const todayInvoices = invoices.filter(inv => inv.createdAt?.startsWith(today));

  const totalRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalItems = todayInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, item) => s + item.quantity, 0),
    0
  );
  const profit = todayInvoices.reduce(
    (sum, inv) =>
      sum + inv.items.reduce(
        (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity,
        0
      ),
    0
  );

  return {
    totalRevenue,
    profit,
    totalItems,
    invoiceCount: todayInvoices.length,
  };
}

export async function getLowStockProducts(): Promise<Product[]> {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) return calcLowStock();
    const data = await response.json();
    return data.lowStockProducts || [];
  } catch {
    return calcLowStock();
  }
}

function calcLowStock(): Product[] {
  const products = getCachedProducts();
  return products.filter(p => p.stock <= p.minStock);
}

export async function getTotalDebt(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) return calcTotalDebt();
    const data = await response.json();
    return data.totalDebt || 0;
  } catch {
    return calcTotalDebt();
  }
}

function calcTotalDebt(): number {
  const invoices = getCachedInvoices();
  return invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.remainingBalance, 0);
}

// ==================== UPDATE INVOICE ====================

export async function updateInvoice(
  id: string,
  updates: Partial<Invoice>
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/invoices?id=${id}&action=update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return false;
  }
}

// ==================== EXPENSES ====================

export async function getAllExpenses(): Promise<Expense[]> {
  try {
    const response = await fetch(`${API_BASE}/expenses`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function getTodayExpenses(): Promise<Expense[]> {
  try {
    const response = await fetch(`${API_BASE}/expenses?filter=today`);
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

export async function createExpense(description: string, amount: number): Promise<Expense> {
  const response = await fetch(`${API_BASE}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, amount }),
  });
  if (!response.ok) throw new Error('Failed to create expense');
  return response.json();
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/expenses?id=${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch {
    return false;
  }
}

// ==================== SETTINGS ====================

export async function getSetting(key: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/settings?key=${key}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.value;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });

    if (!response.ok) throw new Error('Failed to save setting');
  } catch (error) {
    if (isOfflineOrFailed(error)) {
      console.log('📦 أوفلاين - سيتم حفظ الإعدادات لاحقاً');
      return;
    }
    throw error;
  }
}

// ==================== INITIALIZATION ====================

export async function initializeDatabase(): Promise<void> {
  try {
    await getAllProducts();
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }
}
