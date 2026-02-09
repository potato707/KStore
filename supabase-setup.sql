-- ============================================
-- KStore - Supabase Database Setup
-- ============================================
-- Run this in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'piece',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::text),
  customer_id TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remaining_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'partial', 'unpaid')),
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to increment/decrement product stock atomically
CREATE OR REPLACE FUNCTION increment_product_stock(product_id TEXT, quantity_change INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE products
  SET stock = stock + quantity_change,
      updated_at = NOW()
  WHERE id = product_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS (auto-update updated_at)
-- ============================================

-- Products updated_at trigger
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Invoices updated_at trigger
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage products
CREATE POLICY "Users can view products" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert products" ON products
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update products" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete products" ON products
  FOR DELETE USING (auth.role() = 'authenticated');

-- Allow authenticated users to manage invoices
CREATE POLICY "Users can view invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete invoices" ON invoices
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- SAMPLE DATA (optional)
-- ============================================

INSERT INTO products (barcode, name, description, category, cost_price, selling_price, stock, min_stock, unit) VALUES
  ('1234567890', 'مياه معدنية', 'زجاجة مياه معدنية 1.5 لتر', 'مشروبات', 2, 3, 100, 20, 'زجاجة'),
  ('1234567891', 'عصير برتقال', 'عصير برتقال طبيعي', 'مشروبات', 5, 8, 50, 10, 'زجاجة'),
  ('1234567892', 'شيبسي بطاطس', 'شيبسي بطاطس بالجبن', 'وجبات خفيفة', 3, 5, 30, 10, 'كيس'),
  ('1234567893', 'شوكولاتة', 'شوكولاتة بالحليب', 'حلويات', 4, 6, 40, 10, 'قطعة'),
  ('1234567894', 'بسكويت', 'بسكويت بالشاي', 'حلويات', 2, 4, 60, 15, 'كيس')
ON CONFLICT (barcode) DO NOTHING;
