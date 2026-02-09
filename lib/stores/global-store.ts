import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Product,
  Invoice,
} from '@/lib/db/schema';
import {
  getAllProducts,
  getAllInvoices,
  createProduct,
  updateProduct,
  deleteProduct,
  createInvoice,
  updateInvoicePayment,
  deleteInvoice,
  searchProducts as dbSearchProducts,
  getLowStockProducts,
  getTodaySalesStats,
  getTotalDebt,
} from '@/lib/db/database';

interface GlobalStore {
  // Data
  products: Product[];
  invoices: Invoice[];
  lowStockProducts: Product[];
  isOnline: boolean;

  // Today's stats
  todayRevenue: number;
  todayProfit: number;
  todayItems: number;
  todayInvoices: number;
  totalDebt: number;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  loadData: () => Promise<void>;
  refreshData: () => Promise<void>;
  searchProducts: (query: string) => Promise<Product[]>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  editProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  removeProduct: (id: string) => Promise<boolean>;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>) => Promise<Invoice>;
  updateInvoice: (id: string, paidAmount: number) => Promise<boolean>;
  removeInvoice: (id: string) => Promise<boolean>;
  setOnlineStatus: (isOnline: boolean) => void;
  clearError: () => void;
}

export const useGlobalStore = create<GlobalStore>()(
  persist(
    (set, get) => ({
      // Initial state
      products: [],
      invoices: [],
      lowStockProducts: [],
      isOnline: true,
      todayRevenue: 0,
  todayProfit: 0,
  todayItems: 0,
  todayInvoices: 0,
  totalDebt: 0,
  isLoading: false,
  error: null,

  // Load all data
  loadData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [products, invoices, lowStock, stats, debt] = await Promise.all([
        getAllProducts(),
        getAllInvoices(),
        getLowStockProducts(),
        getTodaySalesStats(),
        getTotalDebt(),
      ]);

      set({
        products,
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
  setOnlineStatus: (isOnline) => {
    set({ isOnline });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}),
    {
      name: 'kstore-global',
      partialize: (state) => ({
        products: state.products,
        invoices: state.invoices,
        lowStockProducts: state.lowStockProducts,
      }),
      // Use localStorage with fallback
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Silently fail if localStorage is unavailable
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // Silently fail
          }
        },
      },
    }
  )
);
