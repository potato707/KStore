// Server-side SQLite database using sql.js
import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'data', 'kstore.db');

let db: Database | null = null;

// Initialize database
export async function initDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  
  // Ensure data directory exists
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  // Load or create database
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables(db);
    saveDB(db);
  }

  return db;
}

// Save database to disk
export function saveDB(database: Database = db!): void {
  const data = database.export();
  writeFileSync(DB_PATH, Buffer.from(data));
}

// Create tables
function createTables(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      unit TEXT NOT NULL DEFAULT 'piece',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      customer_name TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'paid',
      payment_method TEXT NOT NULL DEFAULT 'cash',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
  `);
}

// Get database instance
export async function getDB(): Promise<Database> {
  if (!db) {
    await initDB();
  }
  return db!;
}
