import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/lib/db/schema';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  discount: number;
  paymentMethod: 'cash' | 'card';
  notes: string;
  paidAmount: number;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setDiscount: (discount: number) => void;
  setPaymentMethod: (method: 'cash' | 'card') => void;
  setNotes: (notes: string) => void;
  setPaidAmount: (amount: number) => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
  getChangeDue: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      paymentMethod: 'cash',
      notes: '',
      paidAmount: 0,

      addItem: (product: Product, quantity = 1) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        newItems[existingIndex].quantity += quantity;
        return { items: newItems };
      }

      return {
        items: [...state.items, { product, quantity }],
      };
    });
  },

  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, item.product.stock) }
          : item
      ),
    }));
  },

  clearCart: () => {
    set({
      items: [],
      discount: 0,
      paymentMethod: 'cash',
      notes: '',
      paidAmount: 0,
    });
  },

  setDiscount: (discount: number) => {
    set({ discount: Math.max(0, discount) });
  },

  setPaymentMethod: (method: 'cash' | 'card') => {
    set({ paymentMethod: method });
  },

  setNotes: (notes: string) => {
    set({ notes });
  },

  setPaidAmount: (amount: number) => {
    set({ paidAmount: Math.max(0, amount) });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (sum, item) => sum + item.product.sellingPrice * item.quantity,
      0
    );
  },

  getTotal: () => {
    const { items, discount } = get();
    const subtotal = items.reduce(
      (sum, item) => sum + item.product.sellingPrice * item.quantity,
      0
    );
    return Math.max(0, subtotal - discount);
  },

  getItemCount: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getChangeDue: () => {
    const { paidAmount } = get();
    const total = get().getTotal();
    return Math.max(0, paidAmount - total);
  },
}),
    {
      name: 'kstore-cart',
      // Use localStorage with fallback to memory
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
