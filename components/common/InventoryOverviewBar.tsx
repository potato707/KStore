'use client';

import { useEffect, useMemo } from 'react';
import { Package, DollarSign, TrendingUp } from 'lucide-react';
import { useGlobalStore } from '@/lib/stores/global-store';
import { formatCurrency } from '@/lib/utils/cn';

export function InventoryOverviewBar() {
  const { products, loadData } = useGlobalStore();

  useEffect(() => {
    if (products.length === 0) {
      loadData();
    }
  }, [products.length, loadData]);

  const totals = useMemo(() => {
    const wholesaleTotal = products.reduce(
      (sum, product) => sum + product.costPrice * product.stock,
      0
    );

    const retailTotal = products.reduce(
      (sum, product) => sum + product.sellingPrice * product.stock,
      0
    );

    const netProfit = retailTotal - wholesaleTotal;

    return {
      wholesaleTotal,
      retailTotal,
      netProfit,
    };
  }, [products]);

  return (
    <div className="fixed bottom-2 left-1/2 z-10 w-[calc(100%-0.75rem)] max-w-6xl -translate-x-1/2 rounded-xl border border-blue-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:bottom-3 sm:rounded-2xl sm:p-3">
      {/* Mobile: Single Row Compact */}
      <div className="flex items-center justify-between gap-1.5 sm:hidden">
        <div className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
          <Package className="h-3.5 w-3.5 text-slate-600" />
          <span className="text-xs font-bold text-slate-900">{formatCurrency(totals.wholesaleTotal)}</span>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1.5">
          <DollarSign className="h-3.5 w-3.5 text-green-700" />
          <span className="text-xs font-bold text-green-700">{formatCurrency(totals.retailTotal)}</span>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-blue-700" />
          <span className="text-xs font-bold text-blue-700">{formatCurrency(totals.netProfit)}</span>
        </div>
      </div>

      {/* Desktop: Full Details */}
      <div className="hidden grid-cols-3 gap-2 sm:grid">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="mb-1 flex items-center gap-2 text-slate-600">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">قيمة البضاعة بالجملة</span>
          </div>
          <p className="text-base font-bold text-slate-900">{formatCurrency(totals.wholesaleTotal)}</p>
        </div>

        <div className="rounded-xl bg-green-50 px-3 py-2">
          <div className="mb-1 flex items-center gap-2 text-green-700">
            <DollarSign className="h-4 w-4" />
            <span className="text-xs font-medium">قيمة البيع الكلية</span>
          </div>
          <p className="text-base font-bold text-green-700">{formatCurrency(totals.retailTotal)}</p>
        </div>

        <div className="rounded-xl bg-blue-50 px-3 py-2">
          <div className="mb-1 flex items-center gap-2 text-blue-700">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs font-medium">الربح الصافي المتوقع</span>
          </div>
          <p className="text-base font-bold text-blue-700">{formatCurrency(totals.netProfit)}</p>
        </div>
      </div>
    </div>
  );
}
