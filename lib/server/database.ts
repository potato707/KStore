// Server-side JSON file database
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Product, Invoice } from '../db/schema';

const DATA_DIR = join(process.cwd(), 'data');
const PRODUCTS_FILE = join(DATA_DIR, 'products.json');
const INVOICES_FILE = join(DATA_DIR, 'invoices.json');
const SETTINGS_FILE = join(DATA_DIR, 'settings.json');

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
  
  return newInvoice;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const invoices = await getAllInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id);
  
  if (filtered.length === invoices.length) return false;
  
  writeJSON(INVOICES_FILE, filtered);
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
    (sum, inv) => sum + (inv.total - inv.discount),
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
