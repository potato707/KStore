import { supabase } from './client';
import { Product, Invoice, InvoiceItem } from '../db/schema';

// ==================== PRODUCTS ====================

export async function getAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (error) return null;
  return data;
}

export async function createProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...product,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  return !error;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`name.ilike.%${query}%,barcode.ilike.%${query}%,category.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLowStockProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .lte('stock', supabase.raw('min_stock'))
    .order('stock', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ==================== INVOICES ====================

export async function getAllInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function createInvoice(
  invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'synced'>
): Promise<Invoice> {
  // Calculate remaining balance and status
  const remainingBalance = invoice.total - invoice.paidAmount;
  const status: 'paid' | 'partial' | 'unpaid' =
    remainingBalance <= 0 ? 'paid' : (invoice.paidAmount > 0 ? 'partial' : 'unpaid');

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      customer_id: invoice.customerId,
      customer_name: invoice.customerName,
      items: invoice.items,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      total: invoice.total,
      paid_amount: invoice.paidAmount,
      remaining_balance: remainingBalance,
      status: status,
      payment_method: invoice.paymentMethod,
      notes: invoice.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Update product stock
  for (const item of invoice.items) {
    await updateProductStock(item.productId, -item.quantity);
  }

  return data;
}

export async function updateInvoicePayment(
  id: string,
  paidAmount: number
): Promise<boolean> {
  // Get current invoice
  const invoice = await getInvoiceById(id);
  if (!invoice) return false;

  const newPaidAmount = invoice.paidAmount + paidAmount;
  const remainingBalance = invoice.total - newPaidAmount;
  const status: 'paid' | 'partial' | 'unpaid' =
    remainingBalance <= 0 ? 'paid' : 'partial';

  const { error } = await supabase
    .from('invoices')
    .update({
      paid_amount: newPaidAmount,
      remaining_balance: remainingBalance,
      status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  return !error;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  // Get invoice to restore stock
  const invoice = await getInvoiceById(id);
  if (!invoice) return false;

  // Restore stock
  for (const item of invoice.items) {
    await updateProductStock(item.productId, item.quantity);
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  return !error;
}

export async function updateProductStock(
  productId: string,
  quantity: number
): Promise<boolean> {
  // Use raw SQL to increment/decrement stock
  const { error } = await supabase.rpc('increment_product_stock', {
    product_id: productId,
    quantity_change: quantity,
  });

  if (error) {
    // Fallback to regular update if RPC doesn't exist
    const product = await getProductById(productId);
    if (product) {
      return updateProduct(productId, { stock: product.stock + quantity });
    }
    return false;
  }

  return true;
}

// ==================== STATS ====================

export async function getTodaySalesStats(): Promise<{
  totalRevenue: number;
  totalItems: number;
  invoiceCount: number;
  profit: number;
}> {
  const today = new Date().toDateString();

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .gte('created_at', new Date(today).toISOString())
    .lt('created_at', new Date(Date.now() + 86400000).toISOString());

  if (error) throw error;

  const invoices = data || [];
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalItems = invoices.reduce(
    (sum, inv) => sum + (inv.items as InvoiceItem[]).reduce((s, i) => s + i.quantity, 0),
    0
  );
  const invoiceCount = invoices.length;

  const profit = invoices.reduce((sum, inv) => {
    const invoiceProfit = (inv.items as InvoiceItem[]).reduce(
      (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity,
      0
    );
    return sum + invoiceProfit;
  }, 0);

  return { totalRevenue, totalItems, invoiceCount, profit };
}

export async function getTotalDebt(): Promise<number> {
  const { data, error } = await supabase
    .from('invoices')
    .select('remaining_balance')
    .gt('remaining_balance', 0);

  if (error) throw error;
  return data?.reduce((sum, inv) => sum + inv.remaining_balance, 0) || 0;
}
