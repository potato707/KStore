import { NextResponse } from 'next/server';
import { getTodaySalesStats, getLowStockProducts, getTotalDebt } from '@/lib/server/database';

export async function GET() {
  try {
    const [stats, lowStock, debt] = await Promise.all([
      getTodaySalesStats(),
      getLowStockProducts(),
      getTotalDebt(),
    ]);
    
    return NextResponse.json({
      ...stats,
      lowStockProducts: lowStock,
      totalDebt: debt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
