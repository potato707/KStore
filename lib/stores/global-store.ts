import { create } from 'zustand';
import {
  Product,
  Customer,
  Invoice,
} from '@/lib/db/schema';
import {
  getAllProducts,
  getAllCustomers,
  getAllInvoices,
  createProduct,
  updateProduct,
  deleteProduct,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createInvoice,
  updateInvoicePayment,
  deleteInvoice,
  searchProducts as dbSearchProducts,
  getLowStockProducts,
  getSyncStatus,
  updateSyncStatus as dbUpdateSyncStatus,
  initializeSampleData,
  getTodaySalesStats,
  getTotalDebt,
} from '@/lib/db/database';

interface GlobalStore {
  // Data
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  lowStockProducts: Product[];
  isOnline: boolean;
  lastSyncTime: string | null;

  // Today's stats
  todayRevenue: number;
  todayProfit: number;
  todayItems: number;
  todayInvoices: number;
  totalDebt: number;

  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  loadData: () => Promise<void>;
  refreshData: () => Promise<void>;
  searchProducts: (query: string) => Promise<Product[]>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  editProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  removeProduct: (id: string) => Promise<boolean>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'balance' | 'totalPurchases' | 'totalItems'>) => Promise<Customer>;
  editCustomer: (id: string, updates: Partial<Customer>) => Promise<boolean>;
  removeCustomer: (id: string) => Promise<boolean>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => Promise<Invoice>;
  updateInvoice: (id: string, paidAmount: number) => Promise<boolean>;
  removeInvoice: (id: string) => Promise<boolean>;
  setOnlineStatus: (isOnline: boolean) => Promise<void>;
  syncData: () => Promise<void>;
  clearError: () => void;
}

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  // Initial state
  products: [],
  customers: [],
  invoices: [],
  lowStockProducts: [],
  isOnline: true,
  lastSyncTime: null,
  todayRevenue: 0,
  todayProfit: 0,
  todayItems: 0,
  todayInvoices: 0,
  totalDebt: 0,
  isLoading: false,
  isInitialized: false,
  error: null,

  // Initialize database with sample data
  initialize: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true, error: null });
    try {
      await initializeSampleData();

      // Load sync status
      const syncStatus = await getSyncStatus();
      set({
        isOnline: syncStatus.isOnline,
        lastSyncTime: syncStatus.lastSyncTime,
        isInitialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'فشل في تهيئة قاعدة البيانات',
      });
    } finally {
      set({ isLoading: false });
    }
  },

  // Load all data
  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [products, customers, invoices, lowStock, stats, debt] = await Promise.all([
        getAllProducts(),
        getAllCustomers(),
        getAllInvoices(),
        getLowStockProducts(),
        getTodaySalesStats(),
        getTotalDebt(),
      ]);

      set({
        products,
        customers,
        invoices,
        lowStockProducts: lowStock,
        todayRevenue: stats.totalRevenue,
        todayProfit: stats.profit,
        todayItems: stats.totalItems,
        todayInvoices: stats.invoiceCount,
        totalDebt: debt,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'فشل في تحميل البيانات',
        isLoading: false,
      });
    }
  },

  // Refresh data
  refreshData: async () => {
    await get().loadData();
  },

  // Search products
  searchProducts: async (query: string) => {
    if (!query.trim()) return get().products;
    return dbSearchProducts(query);
  },

  // Add product
  addProduct: async (product) => {
    try {
      const newProduct = await createProduct(product);
      const lowStock = await getLowStockProducts();
      set((state) => ({
        products: [...state.products, newProduct],
        lowStockProducts: lowStock,
      }));
      return newProduct;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في إضافة المنتج' });
      throw error;
    }
  },

  // Edit product
  editProduct: async (id, updates) => {
    try {
      const success = await updateProduct(id, updates);
      if (success) {
        await get().loadData();
      }
      return success;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في تحديث المنتج' });
      return false;
    }
  },

  // Remove product
  removeProduct: async (id) => {
    try {
      const success = await deleteProduct(id);
      if (success) {
        await get().loadData();
      }
      return success;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في حذف المنتج' });
      return false;
    }
  },

  // Add customer
  addCustomer: async (customer) => {
    try {
      const newCustomer = await createCustomer(customer);
      set((state) => ({
        customers: [...state.customers, newCustomer],
      }));
      return newCustomer;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في إضافة العميل' });
      throw error;
    }
  },

  // Edit customer
  editCustomer: async (id, updates) => {
    try {
      const success = await updateCustomer(id, updates);
      if (success) {
        await get().loadData();
      }
      return success;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في تحديث العميل' });
      return false;
    }
  },

  // Remove customer
  removeCustomer: async (id) => {
    try {
      const success = await deleteCustomer(id);
      if (success) {
        await get().loadData();
      }
      return success;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في حذف العميل' });
      return false;
    }
  },

  // Add invoice
  addInvoice: async (invoice) => {
    try {
      const newInvoice = await createInvoice(invoice);
      await get().loadData();
      return newInvoice;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في إنشاء الفاتورة' });
      throw error;
    }
  },

  // Update invoice payment
  updateInvoice: async (id, paidAmount) => {
    try {
      const success = await updateInvoicePayment(id, paidAmount);
      if (success) {
        await get().loadData();
      }
      return success;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في تحديث الفاتورة' });
      return false;
    }
  },

  // Remove invoice
  removeInvoice: async (id) => {
    try {
      const success = await deleteInvoice(id);
      if (success) {
        await get().loadData();
      }
      return success;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'فشل في حذف الفاتورة' });
      return false;
    }
  },

  // Set online status
  setOnlineStatus: async (isOnline) => {
    set({ isOnline });
    try {
      await dbUpdateSyncStatus(isOnline);
      const status = await getSyncStatus();
      set({ lastSyncTime: status.lastSyncTime });
    } catch (error) {
      // Ignore sync status errors
    }
  },

  // Sync data with server
  syncData: async () => {
    set({ isLoading: true, error: null });
    try {
      await dbUpdateSyncStatus(get().isOnline);
      const status = await getSyncStatus();
      set({
        lastSyncTime: status.lastSyncTime,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'فشل في المزامنة',
        isLoading: false,
      });
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));
