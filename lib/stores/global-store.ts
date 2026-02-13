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
  returnInvoice as dbReturnInvoice,
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
  returnInvoice: (id: string) => Promise<boolean>;
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
          // Even if loading fails, keep existing cached data
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

      // Search products - works from local state
      searchProducts: async (query: string) => {
        if (!query.trim()) return get().products;
        const lowerQuery = query.toLowerCase();
        return get().products.filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.barcode?.toLowerCase().includes(lowerQuery) ||
            p.category?.toLowerCase().includes(lowerQuery)
        );
      },

      // Add product - optimistic
      addProduct: async (product) => {
        try {
          const newProduct = await createProduct(product);
          // Update state optimistically
          const products = [...get().products, newProduct];
          const lowStock = products.filter(p => p.stock <= p.minStock);
          set({ products, lowStockProducts: lowStock });
          return newProduct;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في إضافة المنتج' });
          throw error;
        }
      },

      // Edit product - optimistic
      editProduct: async (id, updates) => {
        try {
          // Optimistically update local state first
          const products = get().products.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          );
          const lowStock = products.filter(p => p.stock <= p.minStock);
          set({ products, lowStockProducts: lowStock });

          // Then try API
          const success = await updateProduct(id, updates);
          return success;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في تحديث المنتج' });
          return false;
        }
      },

      // Remove product - optimistic
      removeProduct: async (id) => {
        try {
          // Optimistically remove from local state
          const products = get().products.filter(p => p.id !== id);
          const lowStock = products.filter(p => p.stock <= p.minStock);
          set({ products, lowStockProducts: lowStock });

          // Then try API
          const success = await deleteProduct(id);
          return success;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في حذف المنتج' });
          return false;
        }
      },

      // Add invoice - optimistic
      addInvoice: async (invoice) => {
        try {
          const newInvoice = await createInvoice(invoice);

          // Update local state: add invoice + update product stock
          const products = get().products.map(p => {
            const invoiceItem = invoice.items.find(item => item.productId === p.id);
            if (invoiceItem) {
              return { ...p, stock: p.stock - invoiceItem.quantity };
            }
            return p;
          });
          const lowStock = products.filter(p => p.stock <= p.minStock);

          set((state) => ({
            products,
            invoices: [...state.invoices, newInvoice],
            lowStockProducts: lowStock,
            todayRevenue: state.todayRevenue + newInvoice.total,
            todayItems: state.todayItems + invoice.items.reduce((s, i) => s + i.quantity, 0),
            todayInvoices: state.todayInvoices + 1,
            todayProfit: state.todayProfit + invoice.items.reduce(
              (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity, 0
            ),
            totalDebt: state.totalDebt + (newInvoice.remainingBalance || 0),
          }));

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

      // Remove invoice - optimistic
      removeInvoice: async (id) => {
        try {
          // Get invoice before deleting for stock restoration
          const invoice = get().invoices.find(inv => inv.id === id);

          // Optimistically update state
          const invoices = get().invoices.filter(inv => inv.id !== id);
          const products = get().products.map(p => {
            const invoiceItem = invoice?.items.find(item => item.productId === p.id);
            if (invoiceItem) {
              return { ...p, stock: p.stock + invoiceItem.quantity };
            }
            return p;
          });
          const lowStock = products.filter(p => p.stock <= p.minStock);
          set({ invoices, products, lowStockProducts: lowStock });

          // Then try API
          const success = await deleteInvoice(id);
          return success;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في حذف الفاتورة' });
          return false;
        }
      },

      // Return invoice - optimistic
      returnInvoice: async (id) => {
        try {
          // Get invoice before returning for stock restoration
          const invoice = get().invoices.find(inv => inv.id === id);

          // Optimistically update state
          const invoices = get().invoices.filter(inv => inv.id !== id);
          const products = get().products.map(p => {
            const invoiceItem = invoice?.items.find(item => item.productId === p.id);
            if (invoiceItem) {
              return { ...p, stock: p.stock + invoiceItem.quantity };
            }
            return p;
          });
          const lowStock = products.filter(p => p.stock <= p.minStock);
          set({ invoices, products, lowStockProducts: lowStock });

          // Then try API
          const success = await dbReturnInvoice(id);
          return success;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في ترجيع الفاتورة' });
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
