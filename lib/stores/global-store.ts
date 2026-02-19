import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Product,
  Invoice,
  Expense,
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
  updateInvoice as dbUpdateInvoice,
  returnInvoice as dbReturnInvoice,
  getLowStockProducts,
  getTodaySalesStats,
  getTotalDebt,
  getTodayExpenses,
  createExpense as dbCreateExpense,
  deleteExpense as dbDeleteExpense,
} from '@/lib/db/database';
import { addPendingItem } from '@/lib/hooks/use-offline-sync';

interface GlobalStore {
  // Data
  products: Product[];
  invoices: Invoice[];
  lowStockProducts: Product[];
  expenses: Expense[];
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
  editInvoice: (id: string, updates: Partial<Invoice>) => Promise<boolean>;
  removeInvoice: (id: string) => Promise<boolean>;
  returnInvoice: (id: string) => Promise<boolean>;
  addExpense: (description: string, amount: number) => Promise<Expense>;
  removeExpense: (id: string) => Promise<boolean>;
  loadExpenses: () => Promise<void>;
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
      expenses: [],
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
          const [products, invoices, lowStock, stats, debt, expenses] = await Promise.all([
            getAllProducts(),
            getAllInvoices(),
            getLowStockProducts(),
            getTodaySalesStats(),
            getTotalDebt(),
            getTodayExpenses(),
          ]);

          const currentProducts = get().products;
          const currentInvoices = get().invoices;

          // PROTECTION: Don't overwrite existing data with empty arrays
          // This prevents data loss when offline or server returns empty
          const safeProducts = (products && products.length > 0) ? products : currentProducts;
          const safeInvoices = (invoices && invoices.length > 0) ? invoices : currentInvoices;
          const safeLowStock = safeProducts.filter(p => p.stock <= p.minStock);

          set({
            products: safeProducts,
            invoices: safeInvoices,
            lowStockProducts: safeLowStock,
            expenses: expenses || [],
            todayRevenue: stats?.totalRevenue ?? 0,
            todayProfit: stats?.profit ?? 0,
            todayItems: stats?.totalItems ?? 0,
            todayInvoices: stats?.invoiceCount ?? 0,
            totalDebt: debt ?? 0,
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

      // Add product - LOCAL-FIRST
      addProduct: async (product) => {
        const now = new Date().toISOString();
        const localId = `offline_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;

        // 1. Save to state IMMEDIATELY (→ localStorage via persist)
        const localProduct: Product = {
          ...product,
          id: localId,
          createdAt: now,
          updatedAt: now,
        } as Product;

        const products = [...get().products, localProduct];
        const lowStock = products.filter(p => p.stock <= p.minStock);
        set({ products, lowStockProducts: lowStock });

        // 2. Try API in background
        try {
          const serverProduct = await createProduct(product);
          if (serverProduct) {
            // Replace local product with server product (real ID)
            const updatedProducts = get().products.map(p =>
              p.id === localId ? serverProduct : p
            );
            const updatedLowStock = updatedProducts.filter(p => p.stock <= p.minStock);
            set({ products: updatedProducts, lowStockProducts: updatedLowStock });
            return serverProduct;
          } else {
            // API returned null (offline/failed) - queue for sync
            await addPendingItem({
              type: 'product',
              action: 'create',
              data: product,
              synced: false,
            });
            console.log('📦 منتج محفوظ محلياً - سيتم مزامنته لاحقاً');
            return localProduct;
          }
        } catch {
          // Network error - queue for sync
          await addPendingItem({
            type: 'product',
            action: 'create',
            data: product,
            synced: false,
          });
          console.log('📦 منتج محفوظ محلياً - سيتم مزامنته لاحقاً');
          return localProduct;
        }
      },

      // Edit product - LOCAL-FIRST
      editProduct: async (id, updates) => {
        // 1. Update local state FIRST (→ localStorage via persist)
        const products = get().products.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        );
        const lowStock = products.filter(p => p.stock <= p.minStock);
        set({ products, lowStockProducts: lowStock });

        // 2. Try API - if fails, queue for sync
        try {
          const success = await updateProduct(id, updates);
          if (!success && !id.startsWith('offline_')) {
            await addPendingItem({
              type: 'product',
              action: 'update',
              data: { id, ...updates },
              synced: false,
            });
          }
          return true; // Always return true since local state is updated
        } catch {
          if (!id.startsWith('offline_')) {
            await addPendingItem({
              type: 'product',
              action: 'update',
              data: { id, ...updates },
              synced: false,
            });
          }
          return true;
        }
      },

      // Remove product - LOCAL-FIRST
      removeProduct: async (id) => {
        // 1. Remove from local state FIRST
        const products = get().products.filter(p => p.id !== id);
        const lowStock = products.filter(p => p.stock <= p.minStock);
        set({ products, lowStockProducts: lowStock });

        // 2. Try API - if fails, queue for sync
        try {
          const success = await deleteProduct(id);
          if (!success && !id.startsWith('offline_')) {
            await addPendingItem({
              type: 'product',
              action: 'delete',
              data: { id },
              synced: false,
            });
          }
          return true;
        } catch {
          if (!id.startsWith('offline_')) {
            await addPendingItem({
              type: 'product',
              action: 'delete',
              data: { id },
              synced: false,
            });
          }
          return true;
        }
      },

      // Add invoice - LOCAL-FIRST
      addInvoice: async (invoice) => {
        const now = new Date().toISOString();
        const localId = `offline_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`;

        // 1. Create local invoice and save to state IMMEDIATELY
        const localInvoice: Invoice = {
          ...invoice,
          id: localId,
          createdAt: now,
          updatedAt: now,
          synced: false,
        } as Invoice;

        // 2. Update stock locally + add invoice to state
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
          invoices: [...state.invoices, localInvoice],
          lowStockProducts: lowStock,
          todayRevenue: state.todayRevenue + localInvoice.total,
          todayItems: state.todayItems + invoice.items.reduce((s, i) => s + i.quantity, 0),
          todayInvoices: state.todayInvoices + 1,
          todayProfit: state.todayProfit + invoice.items.reduce(
            (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity, 0
          ) - (invoice.discount || 0),
          totalDebt: state.totalDebt + (localInvoice.remainingBalance || 0),
        }));

        // 3. Try API in background (server also updates stock)
        try {
          const serverInvoice = await createInvoice(invoice);
          if (serverInvoice) {
            // Replace local invoice with server invoice (real ID)
            const updatedInvoices = get().invoices.map(inv =>
              inv.id === localId ? { ...serverInvoice, synced: true } : inv
            );
            set({ invoices: updatedInvoices });
            return serverInvoice;
          } else {
            // API failed - queue for sync
            await addPendingItem({
              type: 'invoice',
              action: 'create',
              data: invoice,
              synced: false,
            });
            console.log('📦 فاتورة محفوظة محلياً - سيتم مزامنتها لاحقاً');
            return localInvoice;
          }
        } catch {
          // Network error - queue for sync
          await addPendingItem({
            type: 'invoice',
            action: 'create',
            data: invoice,
            synced: false,
          });
          console.log('📦 فاتورة محفوظة محلياً - سيتم مزامنتها لاحقاً');
          return localInvoice;
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

      // Edit invoice (full update)
      editInvoice: async (id, updates) => {
        try {
          const success = await dbUpdateInvoice(id, updates);
          if (success) {
            // Reload all data to get fresh state
            await get().loadData();
          }
          return success;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في تعديل الفاتورة' });
          return false;
        }
      },

      // Remove invoice - LOCAL-FIRST
      removeInvoice: async (id) => {
        // Get invoice before deleting for stock restoration
        const invoice = get().invoices.find(inv => inv.id === id);

        // 1. Update state FIRST: remove invoice + restore stock
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

        // 2. Try API - if fails, queue for sync
        try {
          const success = await deleteInvoice(id);
          if (!success && !id.startsWith('offline_')) {
            await addPendingItem({
              type: 'invoice',
              action: 'delete',
              data: { id },
              synced: false,
            });
          }
          return true;
        } catch {
          if (!id.startsWith('offline_')) {
            await addPendingItem({
              type: 'invoice',
              action: 'delete',
              data: { id },
              synced: false,
            });
          }
          return true;
        }
      },

      // Return invoice - LOCAL-FIRST
      returnInvoice: async (id) => {
        // Get invoice before returning for stock restoration
        const invoice = get().invoices.find(inv => inv.id === id);

        // 1. Update state FIRST: remove invoice + restore stock
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

        // 2. Try API - if fails, queue for sync
        try {
          const success = await dbReturnInvoice(id);
          if (!success && !id.startsWith('offline_')) {
            await addPendingItem({
              type: 'invoice',
              action: 'delete',
              data: { id, isReturn: true },
              synced: false,
            });
          }
          return true;
        } catch {
          if (!id.startsWith('offline_')) {
            await addPendingItem({
              type: 'invoice',
              action: 'delete',
              data: { id, isReturn: true },
              synced: false,
            });
          }
          return true;
        }
      },

      // Add expense - LOCAL-FIRST
      addExpense: async (description, amount) => {
        const localExpense: Expense = {
          id: `offline_${Date.now().toString(36)}${Math.random().toString(36).substr(2)}`,
          description,
          amount,
          createdAt: new Date().toISOString(),
        };

        // 1. Save to state FIRST
        set((state) => ({
          expenses: [...state.expenses, localExpense],
        }));

        // 2. Try API
        try {
          const serverExpense = await dbCreateExpense(description, amount);
          // Replace local with server version
          const updatedExpenses = get().expenses.map(e =>
            e.id === localExpense.id ? serverExpense : e
          );
          set({ expenses: updatedExpenses });
          return serverExpense;
        } catch {
          console.log('📦 مصروف محفوظ محلياً');
          return localExpense;
        }
      },

      // Remove expense
      removeExpense: async (id) => {
        try {
          const success = await dbDeleteExpense(id);
          if (success) {
            set((state) => ({
              expenses: state.expenses.filter(e => e.id !== id),
            }));
          }
          return success;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'فشل في حذف المصروف' });
          return false;
        }
      },

      // Load expenses
      loadExpenses: async () => {
        try {
          const expenses = await getTodayExpenses();
          set({ expenses });
        } catch (error) {
          console.error('Failed to load expenses:', error);
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
        expenses: state.expenses,
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
