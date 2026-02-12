'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGlobalStore } from '@/lib/stores/global-store';
import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { InvoiceList } from '@/components/sales/InvoiceList';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Calendar,
  Box,
  Package,
  ArrowLeft,
  Filter,
  Download,
} from 'lucide-react';
import Link from 'next/link';

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type PaymentFilter = 'all' | 'cash' | 'card';

export default function SalesPage() {
  const { invoices, loadData, isLoading } = useGlobalStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showItemsModal, setShowItemsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filtered = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt);

      // Date filter
      let dateMatch = true;
      switch (dateFilter) {
        case 'today':
          dateMatch = invoiceDate >= today;
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dateMatch = invoiceDate >= yesterday && invoiceDate < today;
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateMatch = invoiceDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateMatch = invoiceDate >= monthAgo;
          break;
        case 'custom':
          if (!customStartDate && !customEndDate) {
            dateMatch = true;
          } else {
            const start = customStartDate ? new Date(customStartDate) : new Date(0);
            const end = customEndDate ? new Date(customEndDate) : new Date();
            end.setHours(23, 59, 59, 999);
            dateMatch = invoiceDate >= start && invoiceDate <= end;
          }
          break;
        default:
          dateMatch = true;
      }

      // Payment method filter
      const paymentMatch =
        paymentFilter === 'all' || invoice.paymentMethod === paymentFilter;

      return dateMatch && paymentMatch;
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, dateFilter, paymentFilter, customStartDate, customEndDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = filteredInvoices.reduce((sum, inv) => {
      const invoiceProfit = inv.items.reduce(
        (itemSum, item) => itemSum + (item.unitPrice - item.costPrice) * item.quantity,
        0
      );
      return sum + invoiceProfit;
    }, 0);
    const totalItems = filteredInvoices.reduce(
      (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    const totalInvoices = filteredInvoices.length;
    const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    // Group sold items by product
    const soldItemsMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const existing = soldItemsMap.get(item.productId);
        const itemProfit = (item.unitPrice - item.costPrice) * item.quantity;
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
          existing.profit += itemProfit;
        } else {
          soldItemsMap.set(item.productId, {
            name: item.productName,
            quantity: item.quantity,
            revenue: item.totalPrice,
            profit: itemProfit,
          });
        }
      });
    });
    
    const soldItems = Array.from(soldItemsMap.values()).sort((a, b) => b.quantity - a.quantity);

    return {
      totalRevenue,
      totalProfit,
      totalItems,
      totalInvoices,
      avgInvoiceValue,
      soldItems,
    };
  }, [filteredInvoices]);

  const exportToCSV = () => {
    const headers = ['التاريخ', 'رقم الفاتورة', 'عدد الأصناف', 'المبلغ', 'طريقة الدفع'];
    const rows = filteredInvoices.map((inv) => [
      formatDate(inv.createdAt),
      inv.id.slice(-6).toUpperCase(),
      inv.items.length.toString(),
      inv.total.toFixed(2),
      inv.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 ml-2" />
              العودة للرئيسية
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">المبيعات</h1>
              <p className="text-gray-600">إدارة ومراجعة جميع عمليات البيع</p>
            </div>
            <Button onClick={exportToCSV} variant="secondary">
              <Download className="w-4 h-4 ml-2" />
              تصدير CSV
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">إجمالي الربح</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.totalProfit)}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">عدد الفواتير</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Receipt className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="border-gray-200 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setShowItemsModal(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">عدد الأصناف</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                  <p className="text-xs text-blue-600 mt-1">اضغط للتفاصيل</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Box className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">متوسط الفاتورة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats.avgInvoiceValue)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-gray-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">تصفية المبيعات</h3>
            </div>

            {/* Date Filter */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                التاريخ
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={dateFilter === 'all' ? 'primary' : 'ghost'}
                  onClick={() => setDateFilter('all')}
                >
                  الكل
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'today' ? 'primary' : 'ghost'}
                  onClick={() => setDateFilter('today')}
                >
                  اليوم
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'yesterday' ? 'primary' : 'ghost'}
                  onClick={() => setDateFilter('yesterday')}
                >
                  أمس
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'week' ? 'primary' : 'ghost'}
                  onClick={() => setDateFilter('week')}
                >
                  آخر 7 أيام
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'month' ? 'primary' : 'ghost'}
                  onClick={() => setDateFilter('month')}
                >
                  آخر 30 يوم
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'custom' ? 'primary' : 'ghost'}
                  onClick={() => setDateFilter('custom')}
                >
                  <Calendar className="w-4 h-4 ml-2" />
                  تخصيص
                </Button>
              </div>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <Input
                  label="من تاريخ"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <Input
                  label="إلى تاريخ"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            )}

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                طريقة الدفع
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={paymentFilter === 'all' ? 'primary' : 'ghost'}
                  onClick={() => setPaymentFilter('all')}
                >
                  الكل
                </Button>
                <Button
                  size="sm"
                  variant={paymentFilter === 'cash' ? 'primary' : 'ghost'}
                  onClick={() => setPaymentFilter('cash')}
                >
                  نقدي
                </Button>
                <Button
                  size="sm"
                  variant={paymentFilter === 'card' ? 'primary' : 'ghost'}
                  onClick={() => setPaymentFilter('card')}
                >
                  بطاقة
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>
              الفواتير ({filteredInvoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceList compact={false} />
          </CardContent>
        </Card>
      </div>

      {/* Sold Items Modal */}
      <Modal
        isOpen={showItemsModal}
        onClose={() => setShowItemsModal(false)}
        title="تفاصيل الأصناف المباعة"
        size="lg"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الأصناف المباعة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">عدد المنتجات المختلفة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.soldItems.length}</p>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {stats.soldItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Box className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد أصناف مباعة</p>
              </div>
            ) : (
              stats.soldItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>الكمية: <span className="font-bold text-orange-600">{item.quantity}</span></span>
                      <span>•</span>
                      <span>الإيرادات: <span className="font-bold text-green-600">{formatCurrency(item.revenue)}</span></span>
                      <span>•</span>
                      <span>الربح: <span className="font-bold text-blue-600">{formatCurrency(item.profit)}</span></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">رقم {index + 1}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {stats.soldItems.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">إجمالي الإيرادات:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(stats.soldItems.reduce((sum, item) => sum + item.revenue, 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">إجمالي الربح:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(stats.soldItems.reduce((sum, item) => sum + item.profit, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
