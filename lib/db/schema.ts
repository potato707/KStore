// Database types for KStore - Kiosk System with Customer Accounts

export interface Product {
  id: string;
  barcode: string | null;
  name: string;
  description: string | null;
  category: string | null;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  balance: number; // Debt - what they owe (positive = they owe money, negative = they overpaid)
  totalPurchases: number;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  customerId: string | null;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingBalance: number; // What they still owe for this invoice
  paymentMethod: 'cash' | 'card' | 'credit';
  notes: string | null;
  status: 'paid' | 'partial' | 'unpaid';
  createdAt: string;
  updatedAt: string;
  synced: boolean; // For offline sync
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costPrice: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingSync: number;
}
