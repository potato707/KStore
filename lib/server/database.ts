// Server-side JSON file database
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Product, Invoice } from '../db/schema';

const DATA_DIR = join(process.cwd(), 'data');
const PRODUCTS_FILE = join(DATA_DIR, 'products.json');
const INVOICES_FILE = join(DATA_DIR, 'invoices.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');
const EXPENSES_FILE = join(DATA_DIR, 'expenses.json');

export interface Expense {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
}

// Ensure data directory exists
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Helper to read JSON file
function readJSON<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  if (!existsSync(filePath)) {
    writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

// Helper to write JSON file
function writeJSON<T>(filePath: string, data: T): void {
  ensureDataDir();
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Helper to generate IDs
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== PRODUCTS ====================

export async function getAllProducts(): Promise<Product[]> {
  return readJSON<Product[]>(PRODUCTS_FILE, []);
}

export async function getProductById(id: string): Promise<Product | null> {
  const products = await getAllProducts();
  return products.find((p) => p.id === id) || null;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const products = await getAllProducts();
  const id = generateId();
  const now = new Date().toISOString();
  
  const newProduct: Product = {
    ...product,
    id,
    createdAt: now,
    updatedAt: now,
  };
  
  products.push(newProduct);
  writeJSON(PRODUCTS_FILE, products);
  
  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  const products = await getAllProducts();
  const index = products.findIndex((p) => p.id === id);
  
  if (index === -1) return false;
  
  products[index] = {
    ...products[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  
  writeJSON(PRODUCTS_FILE, products);
  return true;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await getAllProducts();
  const filtered = products.filter((p) => p.id !== id);
  
  if (filtered.length === products.length) return false;
  
  writeJSON(PRODUCTS_FILE, filtered);
  return true;
}

// ==================== INVOICES ====================

export async function getAllInvoices(): Promise<Invoice[]> {
  return readJSON<Invoice[]>(INVOICES_FILE, []);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const invoices = await getAllInvoices();
  return invoices.find((inv) => inv.id === id) || null;
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
): Promise<Invoice> {
  const invoices = await getAllInvoices();
  const id = generateId();
  const now = new Date().toISOString();
  
  const newInvoice: Invoice = {
    ...invoice,
    id,
    createdAt: now,
    updatedAt: now,
    synced: true,
  };
  
  invoices.push(newInvoice);
  writeJSON(INVOICES_FILE, invoices);
  
  // Also update product stock
  const products = await getAllProducts();
  for (const item of invoice.items) {
    const pIdx = products.findIndex(p => p.id === item.productId);
    if (pIdx !== -1) {
      products[pIdx].stock -= item.quantity;
      products[pIdx].updatedAt = now;
    }
  }
  writeJSON(PRODUCTS_FILE, products);
  
  return newInvoice;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const invoices = await getAllInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id);
  
  if (filtered.length === invoices.length) return false;
  
  writeJSON(INVOICES_FILE, filtered);
  return true;
}

export async function returnInvoice(id: string): Promise<boolean> {
  // Get the invoice to return
  const invoice = await getInvoiceById(id);
  if (!invoice) return false;
  
  // Return products to stock
  const products = await getAllProducts();
  
  for (const item of invoice.items) {
    const productIndex = products.findIndex((p) => p.id === item.productId);
    if (productIndex !== -1) {
      products[productIndex].stock += item.quantity;
      products[productIndex].updatedAt = new Date().toISOString();
    }
  }
  
  // Save updated products
  writeJSON(PRODUCTS_FILE, products);
  
  // Delete the invoice
  const success = await deleteInvoice(id);
  
  return success;
}

// ==================== UPDATE INVOICE ====================

export async function updateInvoice(
  id: string,
  updates: Partial<Invoice>
): Promise<boolean> {
  const invoices = await getAllInvoices();
  const index = invoices.findIndex((inv) => inv.id === id);
  
  if (index === -1) return false;
  
  // If items changed, handle stock differences
  const oldInvoice = invoices[index];
  if (updates.items) {
    const products = await getAllProducts();
    
    // Restore old stock
    for (const oldItem of oldInvoice.items) {
      const pIdx = products.findIndex(p => p.id === oldItem.productId);
      if (pIdx !== -1) {
        products[pIdx].stock += oldItem.quantity;
      }
    }
    
    // Deduct new stock
    for (const newItem of updates.items) {
      const pIdx = products.findIndex(p => p.id === newItem.productId);
      if (pIdx !== -1) {
        products[pIdx].stock -= newItem.quantity;
        products[pIdx].updatedAt = new Date().toISOString();
      }
    }
    
    writeJSON(PRODUCTS_FILE, products);
  }
  
  invoices[index] = {
    ...invoices[index],
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };
  
  writeJSON(INVOICES_FILE, invoices);
  return true;
}

// ==================== EXPENSES ====================

export async function getAllExpenses(): Promise<Expense[]> {
  return readJSON<Expense[]>(EXPENSES_FILE, []);
}

export async function getTodayExpenses(): Promise<Expense[]> {
  const expenses = await getAllExpenses();
  const today = new Date().toISOString().split('T')[0];
  return expenses.filter(e => e.createdAt.startsWith(today));
}

export async function createExpense(description: string, amount: number): Promise<Expense> {
  const expenses = await getAllExpenses();
  const expense: Expense = {
    id: generateId(),
    description,
    amount,
    createdAt: new Date().toISOString(),
  };
  expenses.push(expense);
  writeJSON(EXPENSES_FILE, expenses);
  return expense;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const expenses = await getAllExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  if (filtered.length === expenses.length) return false;
  writeJSON(EXPENSES_FILE, filtered);
  return true;
}

// ==================== SETTINGS ====================

export async function getSetting(key: string): Promise<string | null> {
  const settings = readJSON<Record<string, string>>(SETTINGS_FILE, {});
  return settings[key] || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const settings = readJSON<Record<string, string>>(SETTINGS_FILE, {});
  settings[key] = value;
  writeJSON(SETTINGS_FILE, settings);
}

// ==================== STATS ====================

export async function getTodaySalesStats() {
  const invoices = await getAllInvoices();
  const today = new Date().toISOString().split('T')[0];
  
  const todayInvoices = invoices.filter((inv) =>
    inv.createdAt.startsWith(today)
  );
  
  const totalRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const profit = todayInvoices.reduce(
    (sum, inv) => {
      const grossProfit = inv.items.reduce(
        (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity,
        0
      );
      return sum + grossProfit - (inv.discount || 0);
    },
    0
  );
  const totalItems = todayInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, item) => s + item.quantity, 0),
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
  const products = await getAllProducts();
  return products.filter((p) => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock);
}

export async function getTotalDebt(): Promise<number> {
  const invoices = await getAllInvoices();
  return invoices.reduce((sum, inv) => sum + (inv.remainingBalance > 0 ? inv.remainingBalance : 0), 0);
}
