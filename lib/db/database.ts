// Client-side database API wrapper - Offline-First
import { Product, Invoice } from './schema';
import { addPendingItem } from '@/lib/hooks/use-offline-sync';

const API_BASE = '/api';

// Helper to generate IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper to check if we're offline (fetch failed)
function isOfflineError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) return true;
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) return true;
  if (error instanceof TypeError && error.message.includes('NetworkError')) return true;
  if (error instanceof TypeError && error.message.includes('network')) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
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
    return response.json();
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
): Promise<Product> {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });

    if (!response.ok) throw new Error('Failed to create product');
    return response.json();
  } catch (error) {
    if (isOfflineError(error)) {
      const now = new Date().toISOString();
      const newProduct: Product = {
        ...product,
        id: `offline_${generateId()}`,
        createdAt: now,
        updatedAt: now,
      };

      await addPendingItem({
        type: 'product',
        action: 'create',
        data: product,
        synced: false,
      });

      console.log('📦 أوفلاين - تم حفظ المنتج محلياً:', newProduct.name);
      return newProduct;
    }
    throw error;
  }
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch (error) {
    if (isOfflineError(error)) {
      await addPendingItem({
        type: 'product',
        action: 'update',
        data: { id, ...updates },
        synced: false,
      });

      console.log('📦 أوفلاين - تم حفظ تحديث المنتج محلياً');
      return true;
    }
    return false;
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
    const response = await fetch(`${API_BASE}/products?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.success;
  } catch (error) {
    if (isOfflineError(error)) {
      if (!id.startsWith('offline_')) {
        await addPendingItem({
          type: 'product',
          action: 'delete',
          data: { id },
          synced: false,
        });
      }

      console.log('📦 أوفلاين - تم حذف المنتج محلياً');
      return true;
    }
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
    return response.json();
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
): Promise<Invoice> {
  // Update product stock (works offline too now)
  for (const item of invoice.items) {
    await updateProductStock(item.productId, -item.quantity);
  }

  try {
    const response = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });

    if (!response.ok) throw new Error('Failed to create invoice');
    return response.json();
  } catch (error) {
    if (isOfflineError(error)) {
      const now = new Date().toISOString();
      const newInvoice: Invoice = {
        ...invoice,
        id: `offline_${generateId()}`,
        createdAt: now,
        updatedAt: now,
        synced: false,
      };

      await addPendingItem({
        type: 'invoice',
        action: 'create',
        data: {
          invoice: invoice,
          stockChanges: invoice.items.map(item => ({
            productId: item.productId,
            quantity: -item.quantity,
          })),
        },
        synced: false,
      });

      console.log('📦 أوفلاين - تم حفظ الفاتورة محلياً');
      return newInvoice;
    }
    throw error;
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
    if (isOfflineError(error)) {
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
    if (isOfflineError(error)) {
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
    if (isOfflineError(error)) {
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
