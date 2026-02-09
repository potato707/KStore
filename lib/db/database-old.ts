// Browser-based database using IndexedDB for persistence
import {
  Product,
  Customer,
  Invoice,
  InvoiceItem,
} from './schema';

// IndexedDB setup
const DB_NAME = 'KStoreDB';
const DB_VERSION = 2; // Increment version to add customer store
const STORES = ['products', 'customers', 'invoices', 'settings'] as const;

let db: IDBDatabase | null = null;

// Open IndexedDB
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      for (const storeName of STORES) {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };
  });
}

// Get database instance
async function getDb(): Promise<IDBDatabase> {
  if (!db) {
    db = await openDB();
  }
  return db;
}

// Generic CRUD operations
async function getAll<T extends { id: string }>(storeName: string): Promise<T[]> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function get<T extends { id: string }>(
  storeName: string,
  id: string
): Promise<T | null> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as T || null);
    request.onerror = () => reject(request.error);
  });
}

async function put<T extends { id: string }>(
  storeName: string,
  data: T
): Promise<T> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

async function remove(storeName: string, id: string): Promise<boolean> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ==================== SETTINGS ====================

export async function getSetting(key: string): Promise<string | null> {
  const settings = await get<{ id: string; value: string }>('settings', key);
  return settings ? settings.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await put('settings', { id: key, value });
}

// ==================== PRODUCTS ====================

export async function getAllProducts(): Promise<Product[]> {
  return getAll<Product>('products');
}

export async function getProductById(id: string): Promise<Product | null> {
  return get<Product>('products', id);
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const products = await getAllProducts();
  return products.find((p) => p.barcode === barcode) || null;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const id = generateId();
  const now = new Date().toISOString();

  const newProduct: Product = {
    ...product,
    id,
    createdAt: now,
    updatedAt: now,
  };

  await put('products', newProduct);
  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  const product = await getProductById(id);
  if (!product) return false;

  const updated: Product = {
    ...product,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  await put('products', updated);
  return true;
}

export async function updateProductStock(
  productId: string,
  quantity: number
): Promise<boolean> {
  const product = await getProductById(productId);
  if (!product) return false;

  product.stock += quantity;
  product.updatedAt = new Date().toISOString();

  await put('products', product);
  return true;
}

export async function deleteProduct(id: string): Promise<boolean> {
  return remove('products', id);
}

export async function searchProducts(query: string): Promise<Product[]> {
  const products = await getAllProducts();
  const searchLower = query.toLowerCase();

  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.barcode && p.barcode.includes(query)) ||
      (p.category && p.category.toLowerCase().includes(searchLower))
  );
}

export async function getLowStockProducts(): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.stock <= p.minStock);
}

// ==================== CUSTOMERS ====================

export async function getAllCustomers(): Promise<Customer[]> {
  return getAll<Customer>('customers');
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return get<Customer>('customers', id);
}

export async function createCustomer(
  customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'balance' | 'totalPurchases' | 'totalItems'>
): Promise<Customer> {
  const id = generateId();
  const now = new Date().toISOString();

  const newCustomer: Customer = {
    ...customer,
    id,
    balance: 0,
    totalPurchases: 0,
    totalItems: 0,
    createdAt: now,
    updatedAt: now,
  };

  await put('customers', newCustomer);
  return newCustomer;
}

export async function updateCustomer(
  id: string,
  updates: Partial<Customer>
): Promise<boolean> {
  const customer = await getCustomerById(id);
  if (!customer) return false;

  const updated: Customer = {
    ...customer,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  await put('customers', updated);
  return true;
}

export async function updateCustomerBalance(
  customerId: string,
  purchaseAmount: number,
  paidAmount: number
): Promise<boolean> {
  const customer = await getCustomerById(customerId);
  if (!customer) return false;

  customer.balance += (purchaseAmount - paidAmount);
  customer.updatedAt = new Date().toISOString();

  await put('customers', customer);
  return true;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  return remove('customers', id);
}

// ==================== INVOICES ====================

export async function getAllInvoices(): Promise<Invoice[]> {
  return getAll<Invoice>('invoices');
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  return get<Invoice>('invoices', id);
}

export async function getInvoicesByCustomerId(customerId: string): Promise<Invoice[]> {
  const invoices = await getAllInvoices();
  return invoices.filter((inv) => inv.customerId === customerId);
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
): Promise<Invoice> {
  const id = generateId();
  const now = new Date().toISOString();

  // Calculate remaining balance
  const remainingBalance = invoice.total - invoice.paidAmount;
  const status: 'paid' | 'partial' | 'unpaid' =
    remainingBalance <= 0 ? 'paid' : (invoice.paidAmount > 0 ? 'partial' : 'unpaid');

  const newInvoice: Invoice = {
    ...invoice,
    id,
    remainingBalance,
    status,
    createdAt: now,
    updatedAt: now,
    synced: false,
  };

  // Update product stock
  for (const item of invoice.items) {
    await updateProductStock(item.productId, -item.quantity);
  }

  // Update customer balance and stats if customer exists
  if (invoice.customerId) {
    const customer = await getCustomerById(invoice.customerId);
    if (customer) {
      // Update balance (positive = they owe money)
      customer.balance += remainingBalance;
      // Update stats
      customer.totalPurchases += 1;
      customer.totalItems += invoice.items.reduce((sum, item) => sum + item.quantity, 0);
      customer.updatedAt = now;
      await put('customers', customer);
    }
  }

  await put('invoices', newInvoice);
  return newInvoice;
}

export async function updateInvoicePayment(
  id: string,
  paidAmount: number
): Promise<boolean> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return false;

  const newPaidAmount = invoice.paidAmount + paidAmount;
  const remainingBalance = invoice.total - newPaidAmount;
  const status: 'paid' | 'partial' | 'unpaid' =
    remainingBalance <= 0 ? 'paid' : 'partial';

  invoice.paidAmount = newPaidAmount;
  invoice.remainingBalance = remainingBalance;
  invoice.status = status;
  invoice.updatedAt = new Date().toISOString();

  // Update customer balance if customer exists and there's still debt
  if (invoice.customerId) {
    const customer = await getCustomerById(invoice.customerId);
    if (customer) {
      customer.balance -= paidAmount; // Reduce debt
      customer.updatedAt = new Date().toISOString();
      await put('customers', customer);
    }
  }

  await put('invoices', invoice);
  return true;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  const invoice = await getInvoiceById(id);
  if (!invoice) return false;

  // Restore stock
  for (const item of invoice.items) {
    await updateProductStock(item.productId, item.quantity);
  }

  // Update customer balance (remove the debt)
  if (invoice.customerId) {
    const customer = await getCustomerById(invoice.customerId);
    if (customer && invoice.remainingBalance > 0) {
      customer.balance -= invoice.remainingBalance;
      customer.updatedAt = new Date().toISOString();
      await put('customers', customer);
    }
  }

  return remove('invoices', id);
}

// ==================== SYNC ====================

export async function getPendingSyncInvoices(): Promise<Invoice[]> {
  const invoices = await getAllInvoices();
  return invoices.filter((inv) => !inv.synced);
}

export async function markInvoicesAsSynced(invoiceIds: string[]): Promise<boolean> {
  for (const id of invoiceIds) {
    const invoice = await getInvoiceById(id);
    if (invoice) {
      invoice.synced = true;
      await put('invoices', invoice);
    }
  }
  return true;
}

export async function getSyncStatus(): Promise<{
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingSync: number;
}> {
  const pending = (await getPendingSyncInvoices()).length;

  // Get settings from IndexedDB
  const database = await getDb();
  return new Promise((resolve) => {
    const transaction = database.transaction('settings', 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get('syncStatus');

    request.onsuccess = () => {
      const data = request.result;
      resolve({
        isOnline: data?.isOnline ?? true,
        lastSyncTime: data?.lastSyncTime ?? null,
        pendingSync: pending,
      });
    };

    request.onerror = () => {
      resolve({
        isOnline: true,
        lastSyncTime: null,
        pendingSync: pending,
      });
    };
  });
}

export async function updateSyncStatus(isOnline: boolean): Promise<void> {
  const database = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('settings', 'readwrite');
    const store = transaction.objectStore('settings');

    store.put({
      id: 'syncStatus',
      isOnline,
      lastSyncTime: new Date().toISOString(),
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ==================== UTILITY ====================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Calculate total profit from invoices
export async function getTodaySalesStats(): Promise<{
  totalRevenue: number;
  totalItems: number;
  invoiceCount: number;
  profit: number;
}> {
  const invoices = await getAllInvoices();
  const today = new Date().toDateString();

  const todayInvoices = invoices.filter(
    (inv) => new Date(inv.createdAt).toDateString() === today
  );

  const totalRevenue = todayInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalItems = todayInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const invoiceCount = todayInvoices.length;

  const profit = todayInvoices.reduce((sum, inv) => {
    const invoiceProfit = inv.items.reduce(
      (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity,
      0
    );
    return sum + invoiceProfit;
  }, 0);

  return { totalRevenue, totalItems, invoiceCount, profit };
}

// Get total debt from all customers
export async function getTotalDebt(): Promise<number> {
  const customers = await getAllCustomers();
  return customers.reduce((sum, c) => sum + Math.max(0, c.balance), 0);
}

// Initialize with sample data if empty
export async function initializeSampleData(): Promise<void> {
  const products = await getAllProducts();
  const customers = await getAllCustomers();

  if (products.length === 0) {
    // Add sample products
    const sampleProducts = [
      {
        barcode: '1234567890',
        name: 'مياه معدنية',
        description: 'زجاجة مياه معدنية 1.5 لتر',
        category: 'مشروبات',
        costPrice: 2,
        sellingPrice: 3,
        stock: 100,
        minStock: 20,
        unit: 'زجاجة',
      },
      {
        barcode: '1234567891',
        name: 'عصير برتقال',
        description: 'عصير برتقال طبيعي',
        category: 'مشروبات',
        costPrice: 5,
        sellingPrice: 8,
        stock: 50,
        minStock: 10,
        unit: 'زجاجة',
      },
      {
        barcode: '1234567892',
        name: 'شيبسي بطاطس',
        description: 'شيبسي بطاطس بالجبن',
        category: 'وجبات خفيفة',
        costPrice: 3,
        sellingPrice: 5,
        stock: 30,
        minStock: 10,
        unit: 'كيس',
      },
      {
        barcode: '1234567893',
        name: 'شوكولاتة',
        description: 'شوكولاتة بالحليب',
        category: 'حلويات',
        costPrice: 4,
        sellingPrice: 6,
        stock: 40,
        minStock: 10,
        unit: 'قطعة',
      },
      {
        barcode: '1234567894',
        name: 'بسكويت',
        description: 'بسكويت بالشاي',
        category: 'حلويات',
        costPrice: 2,
        sellingPrice: 4,
        stock: 60,
        minStock: 15,
        unit: 'كيس',
      },
      {
        barcode: '1234567895',
        name: 'شاي',
        description: 'شاي أكياس',
        category: 'مشروبات',
        costPrice: 15,
        sellingPrice: 25,
        stock: 20,
        minStock: 5,
        unit: 'علبة',
      },
      {
        barcode: '1234567896',
        name: 'سكر',
        description: 'سكر أبيض 1 كيلو',
        category: 'بقالة',
        costPrice: 20,
        sellingPrice: 30,
        stock: 25,
        minStock: 10,
        unit: 'كيلو',
      },
      {
        barcode: '1234567897',
        name: 'حليب',
        description: 'حليب معلب',
        category: 'ألبان',
        costPrice: 10,
        sellingPrice: 15,
        stock: 30,
        minStock: 10,
        unit: 'علبة',
      },
    ];

    for (const product of sampleProducts) {
      await createProduct(product);
    }
  }

  if (customers.length === 0) {
    // Add sample customers
    const sampleCustomers = [
      {
        name: 'أحمد محمد',
        phone: '01012345678',
      },
      {
        name: 'محمد علي',
        phone: '01123456789',
      },
    ];

    for (const customer of sampleCustomers) {
      await createCustomer(customer);
    }
  }
}
