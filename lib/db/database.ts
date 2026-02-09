// Client-side database API wrapper
import { Product, Invoice } from './schema';

const API_BASE = '/api';

// Helper to generate IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== PRODUCTS ====================

export async function getAllProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/products`);
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export async function getProductById(id: string): Promise<Product | null> {
  const response = await fetch(`${API_BASE}/products?id=${id}`);
  if (!response.ok) return null;
  return response.json();
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const products = await getAllProducts();
  return products.find((p) => p.barcode === barcode) || null;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const response = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  const response = await fetch(`${API_BASE}/products`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  });
  
  if (!response.ok) return false;
  const result = await response.json();
  return result.success;
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
  const response = await fetch(`${API_BASE}/products?id=${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) return false;
  const result = await response.json();
  return result.success;
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
  const response = await fetch(`${API_BASE}/invoices`);
  if (!response.ok) throw new Error('Failed to fetch invoices');
  return response.json();
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getAllInvoices();
  return invoices.find((inv) => inv.id === id) || null;
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
): Promise<Invoice> {
  // Update product stock
  for (const item of invoice.items) {
    await updateProductStock(item.productId, -item.quantity);
  }

  const response = await fetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  
  if (!response.ok) throw new Error('Failed to create invoice');
  return response.json();
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
  // For now, we'll just return false
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

  const response = await fetch(`${API_BASE}/invoices?id=${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) return false;
  const result = await response.json();
  return result.success;
}

// ==================== STATS ====================

export async function getTodaySalesStats() {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) {
    return { totalRevenue: 0, profit: 0, totalItems: 0, invoiceCount: 0 };
  }
  return response.json();
}

export async function getLowStockProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.lowStockProducts || [];
}

export async function getTotalDebt(): Promise<number> {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) return 0;
  const data = await response.json();
  return data.totalDebt || 0;
}

// ==================== SETTINGS ====================

export async function getSetting(key: string): Promise<string | null> {
  const response = await fetch(`${API_BASE}/settings?key=${key}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  
  if (!response.ok) throw new Error('Failed to save setting');
}

// ==================== INITIALIZATION ====================

export async function initializeDatabase(): Promise<void> {
  // Database is initialized on the server side
  // Just check if we can connect
  try {
    await getAllProducts();
  } catch (error) {
    console.error('Failed to connect to database:', error);
  }
}
