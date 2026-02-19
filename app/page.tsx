'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  Search,
  Plus,
  Barcode,
  Camera,
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Box,
  Receipt,
  ArrowRight,
  Wallet,
  Trash2,
  Edit3,
  CalendarDays,
  LogOut,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useGlobalStore } from '@/lib/stores/global-store';
import { useCartStore } from '@/lib/stores/cart-store';
import { useBarcodeScanner } from '@/lib/hooks/use-barcode-scanner';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import { formatCurrency, formatDate, cn } from '@/lib/utils/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/Modal';
import { ProductForm } from '@/components/inventory/ProductForm';
import { CartPanel } from '@/components/sales/CartPanel';
import { InvoiceList } from '@/components/sales/InvoiceList';
import { OfflineIndicator, InstallPrompt } from '@/components/common/OfflineIndicator';
import { CameraBarcodeScanner } from '@/components/common/CameraBarcodeScanner';

type Tab = 'dashboard' | 'inventory' | 'sales';

export default function HomePage() {
  const {
    products,
    invoices,
    lowStockProducts,
    expenses,
    isOnline,
    isLoading,
    todayRevenue,
    todayProfit,
    todayItems,
    todayInvoices,
    loadData,
    addProduct,
    editProduct,
    removeProduct,
    addInvoice,
    editInvoice,
    addExpense,
    removeExpense,
    setOnlineStatus,
  } = useGlobalStore();

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [showTodayItemsModal, setShowTodayItemsModal] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [showDailyStatsModal, setShowDailyStatsModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);

  const { logout } = useAuth();
  const cart = useCartStore();
  const { syncPending } = useOfflineSync();

  const handleBarcodeDetected = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      cart.addItem(product);
    } else {
      // Product not found - show product modal with barcode
      setScannedProduct({ barcode, notFound: true });
      setShowProductModal(true);
    }
  };

  const handleManualBarcodeSearch = () => {
    const barcode = barcodeInput.trim();
    if (!barcode) return;

    const product = products.find(p => p.barcode === barcode);
    if (product) {
      cart.addItem(product);
      setBarcodeFeedback({ type: 'success', message: `✅ تمت الإضافة: ${product.name}` });
      setBarcodeInput('');
      // Switch to sales tab if not already there
      if (activeTab !== 'sales') setActiveTab('sales');
    } else {
      setBarcodeFeedback({ type: 'error', message: `❌ لا يوجد منتج بهذا الباركود: ${barcode}` });
    }
    // Clear feedback after 3 seconds
    setTimeout(() => setBarcodeFeedback(null), 3000);
  };

  // Track modal state
  useEffect(() => {
    setIsAnyModalOpen(showProductModal || showCameraScanner || showLowStockModal || showExpensesModal || showDailyStatsModal || showChangePasswordModal);
  }, [showProductModal, showCameraScanner, showLowStockModal, showExpensesModal, showDailyStatsModal, showChangePasswordModal]);

  // Calculate today's sold items details
  const todaySoldItems = (() => {
    const today = new Date().toISOString().split('T')[0];
    const todayInvoices = invoices.filter(inv => inv.createdAt.startsWith(today));
    
    const soldItemsMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
    todayInvoices.forEach(inv => {
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
    
    return Array.from(soldItemsMap.values()).sort((a, b) => b.quantity - a.quantity);
  })();

  // Calculate monthly daily stats
  const monthlyDailyStats = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    
    const days: { date: string; dayLabel: string; revenue: number; profit: number; invoiceCount: number; items: number }[] = [];
    
    for (let d = 1; d <= today; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayInvoices = invoices.filter(inv => inv.createdAt.startsWith(dateStr));
      
      const revenue = dayInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const profit = dayInvoices.reduce((sum, inv) => {
        const gp = inv.items.reduce((s, item) => s + (item.unitPrice - item.costPrice) * item.quantity, 0);
        return sum + gp - (inv.discount || 0);
      }, 0);
      const invoiceCount = dayInvoices.length;
      const items = dayInvoices.reduce((sum, inv) => sum + inv.items.reduce((s, i) => s + i.quantity, 0), 0);
      
      days.push({
        date: dateStr,
        dayLabel: `${d}/${month + 1}`,
        revenue,
        profit,
        invoiceCount,
        items,
      });
    }
    
    return days.reverse(); // newest first
  })();

  // Get today's invoices for the table
  const todayInvoicesList = (() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices
      .filter(inv => inv.createdAt.startsWith(today))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  })();

  // Total expenses today
  const todayExpensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Clear old authentication cookies on mount
  useEffect(() => {
    // Clear old auth cookies that might cause issues
    const cookiesToClear = ['kstore_session', 'kstore_auth'];
    cookiesToClear.forEach(cookieName => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  // Barcode scanner - DISABLED when modal is open
  useBarcodeScanner({
    enabled: true,
    disabledWhenModalOpen: isAnyModalOpen, // Disable when any modal is open
    onScan: handleBarcodeDetected,
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery)) ||
    (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Refresh data from server
  const handleRefresh = async () => {
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Install Prompt */}
      <InstallPrompt />

      <CameraBarcodeScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onDetected={handleBarcodeDetected}
      />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">KStore</h1>
              <p className="text-xs text-gray-500">نظام كشك البيع</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {/* Online Status */}
            <div className={cn(
              'flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium',
              isOnline
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            )}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline ? 'متصل' : 'غير متصل'}
            </div>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              تحديث
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCameraScanner(true)}
              className="h-11 w-full rounded-xl px-4 sm:h-8 sm:w-auto sm:rounded-lg sm:px-3"
            >
              <Camera className="w-4 h-4" />
              <span className="sm:hidden">كاميرا</span>
              <span className="hidden sm:inline">كاميرا باركود</span>
            </Button>

            {/* Change Password */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChangePasswordModal(true)}
              title="تغيير كلمة السر"
            >
              <KeyRound className="w-4 h-4" />
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-red-600 hover:bg-red-50"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Barcode Manual Search */}
        <div className="px-6 py-2 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="ادخل رقم الباركود يدوي..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualBarcodeSearch();
                  }
                }}
                className="w-full h-10 pr-10 pl-3 text-sm border border-gray-300 rounded-lg bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-400"
              />
            </div>
            <Button
              size="sm"
              onClick={handleManualBarcodeSearch}
              disabled={!barcodeInput.trim()}
              className="h-10 px-4"
            >
              <Search className="w-4 h-4" />
              بحث
            </Button>
          </div>
          {barcodeFeedback && (
            <div className={cn(
              'mt-2 px-3 py-2 rounded-lg text-sm font-medium max-w-lg',
              barcodeFeedback.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {barcodeFeedback.message}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-2 px-6 pb-4">
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon={<TrendingUp className="w-4 h-4" />}
            label="لوحة التحكم"
          />
          <TabButton
            active={activeTab === 'inventory'}
            onClick={() => setActiveTab('inventory')}
            icon={<Package className="w-4 h-4" />}
            label="المخزون"
          />
          <TabButton
            active={activeTab === 'sales'}
            onClick={() => setActiveTab('sales')}
            icon={<ShoppingCart className="w-4 h-4" />}
            label="المبيعات"
          />
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    تنبيه: منتجات منخفضة المخزون
                  </p>
                  <p className="text-sm text-amber-700">
                    {lowStockProducts.length} منتج وصلت للحد الأدنى
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLowStockModal(true)}
                className="border border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                عرض المنتجات
              </Button>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards + Action Buttons Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                title="مبيعات اليوم"
                value={formatCurrency(todayRevenue)}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                trend={`${todayInvoices} فاتورة`}
              />
              <StatCard
                title="صافي الربح"
                value={formatCurrency(todayProfit)}
                icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
                subtext="Net Profit"
              />
              <div onClick={() => setShowTodayItemsModal(true)} className="cursor-pointer">
                <StatCard
                  title="أصناف مباعة"
                  value={todayItems.toString()}
                  icon={<Box className="w-5 h-5 text-purple-600" />}
                  subtext="اضغط للتفاصيل"
                />
              </div>
              <StatCard
                title="المنتجات"
                value={products.length.toString()}
                icon={<Package className="w-5 h-5 text-orange-600" />}
                subtext={`${lowStockProducts.length} منخفض`}
              />
              <div onClick={() => setShowExpensesModal(true)} className="cursor-pointer">
                <StatCard
                  title="مصروفات اليوم"
                  value={formatCurrency(todayExpensesTotal)}
                  icon={<Wallet className="w-5 h-5 text-red-600" />}
                  subtext="اضغط للإدارة"
                />
              </div>
              <div onClick={() => setShowDailyStatsModal(true)} className="cursor-pointer">
                <StatCard
                  title="اليومية"
                  value={`${monthlyDailyStats.length} يوم`}
                  icon={<CalendarDays className="w-5 h-5 text-indigo-600" />}
                  subtext="إحصائيات الشهر"
                />
              </div>
            </div>

            {/* Today's Sales Table */}
            <Card className="border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    مبيعات اليوم - {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </CardTitle>
                </div>
                <Link href="/sales">
                  <Button variant="ghost" size="sm">
                    عرض الكل
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {todayInvoicesList.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">لا توجد مبيعات اليوم بعد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-right py-3 px-3 font-medium text-gray-600">#</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">الوقت</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">الأصناف</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">الإجمالي</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">الخصم</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">صافي الربح</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">الدفع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayInvoicesList.map((invoice, idx) => {
                          const invoiceProfit = invoice.items.reduce(
                            (s, item) => s + (item.unitPrice - item.costPrice) * item.quantity, 0
                          ) - (invoice.discount || 0);
                          return (
                            <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-3 text-gray-500">{idx + 1}</td>
                              <td className="py-3 px-3 text-gray-700">
                                {new Date(invoice.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-gray-900">{invoice.items.length} صنف</span>
                                <span className="text-gray-400 mx-1">•</span>
                                <span className="text-gray-500">{invoice.items.reduce((s, i) => s + i.quantity, 0)} قطعة</span>
                              </td>
                              <td className="py-3 px-3 font-bold text-gray-900">{formatCurrency(invoice.total)}</td>
                              <td className="py-3 px-3">
                                {invoice.discount > 0 ? (
                                  <span className="text-red-600">-{formatCurrency(invoice.discount)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-medium text-green-600">{formatCurrency(invoiceProfit)}</td>
                              <td className="py-3 px-3">
                                <span className={cn(
                                  'px-2 py-1 rounded-full text-xs font-medium',
                                  invoice.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                )}>
                                  {invoice.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={3} className="py-3 px-3 text-gray-700">المجموع ({todayInvoicesList.length} فاتورة)</td>
                          <td className="py-3 px-3 text-gray-900">{formatCurrency(todayRevenue)}</td>
                          <td className="py-3 px-3 text-red-600">
                            -{formatCurrency(todayInvoicesList.reduce((s, inv) => s + (inv.discount || 0), 0))}
                          </td>
                          <td className="py-3 px-3 text-green-600">{formatCurrency(todayProfit)}</td>
                          <td className="py-3 px-3"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Stats for Current Month - Always Visible */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  اليومية - {new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-right py-3 px-3 font-medium text-gray-600">اليوم</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">المبيعات</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">صافي الربح</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">الفواتير</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">الأصناف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyDailyStats.map((day) => (
                        <tr key={day.date} className={cn(
                          "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                          day.date === new Date().toISOString().split('T')[0] && "bg-blue-50 font-medium"
                        )}>
                          <td className="py-3 px-3 text-gray-700">
                            {day.date === new Date().toISOString().split('T')[0] ? (
                              <span className="text-blue-600 font-bold">اليوم ({day.dayLabel})</span>
                            ) : (
                              day.dayLabel
                            )}
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-900">{formatCurrency(day.revenue)}</td>
                          <td className="py-3 px-3 font-medium text-green-600">{formatCurrency(day.profit)}</td>
                          <td className="py-3 px-3 text-gray-700">{day.invoiceCount}</td>
                          <td className="py-3 px-3 text-gray-700">{day.items}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td className="py-3 px-3 text-gray-700">إجمالي الشهر</td>
                        <td className="py-3 px-3 text-gray-900">{formatCurrency(monthlyDailyStats.reduce((s, d) => s + d.revenue, 0))}</td>
                        <td className="py-3 px-3 text-green-600">{formatCurrency(monthlyDailyStats.reduce((s, d) => s + d.profit, 0))}</td>
                        <td className="py-3 px-3 text-gray-700">{monthlyDailyStats.reduce((s, d) => s + d.invoiceCount, 0)}</td>
                        <td className="py-3 px-3 text-gray-700">{monthlyDailyStats.reduce((s, d) => s + d.items, 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="بحث عن منتج..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button onClick={() => setShowProductModal(true)}>
                <Plus className="w-4 h-4" />
                إضافة منتج
              </Button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={() => {
                    cart.addItem(product);
                  }}
                  onEdit={() => {
                    setEditingProduct(product);
                    setShowProductModal(true);
                  }}
                  onDelete={() => {
                    setDeletingProduct(product);
                  }}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد منتجات</p>
              </div>
            )}
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products List for Quick Add - HIDDEN */}
            <div className="lg:col-span-2">
              {/* Recent Invoices */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                    <Receipt className="w-5 h-5" />
                    آخر المبيعات
                  </h2>
                  <Link href="/sales">
                    <Button variant="ghost" size="sm">
                      عرض الكل
                      <ArrowRight className="w-4 h-4 mr-2" />
                    </Button>
                  </Link>
                </div>
                <InvoiceList compact />
              </div>
            </div>

            {/* Cart Panel */}
            <div className="lg:col-span-1">
              <CartPanel />
            </div>
          </div>
        )}
      </main>

      {/* Product Modal */}
      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
          setScannedProduct(null);
        }}
        title={editingProduct ? 'تعديل المنتج' : (scannedProduct?.notFound ? 'إضافة منتج جديد' : 'إضافة منتج جديد')}
        size="lg"
      >
        <ProductForm
          product={editingProduct}
          onSubmit={async (data) => {
            if (editingProduct) {
              await editProduct(editingProduct.id, data);
            } else {
              await addProduct(data);
            }
            setShowProductModal(false);
            setEditingProduct(null);
            setScannedProduct(null);
          }}
          onCancel={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            setScannedProduct(null);
          }}
          scannedBarcode={scannedProduct?.barcode}
        />
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={async () => {
          if (deletingProduct) {
            await removeProduct(deletingProduct.id);
            setDeletingProduct(null);
          }
        }}
        title="حذف المنتج"
        message={`هل أنت متأكد من حذف "${deletingProduct?.name}"؟`}
        confirmText="حذف"
        cancelText="إلغاء"
      />

      {/* Today's Sold Items Modal */}
      <Modal
        isOpen={showTodayItemsModal}
        onClose={() => setShowTodayItemsModal(false)}
        title="تفاصيل الأصناف المباعة اليوم"
        size="lg"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">إجمالي الأصناف المباعة</p>
                <p className="text-2xl font-bold text-gray-900">{todayItems}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">عدد المنتجات المختلفة</p>
                <p className="text-2xl font-bold text-gray-900">{todaySoldItems.length}</p>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {todaySoldItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Box className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد أصناف مباعة اليوم</p>
              </div>
            ) : (
              todaySoldItems.map((item, index) => (
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
          {todaySoldItems.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">إجمالي الإيرادات:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(todaySoldItems.reduce((sum, item) => sum + item.revenue, 0))}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-600">إجمالي الربح:</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency(todaySoldItems.reduce((sum, item) => sum + item.profit, 0))}
                </span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Expenses Modal */}
      <Modal
        isOpen={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        title="مصروفات اليوم"
        size="lg"
      >
        <div className="space-y-4">
          {/* Add Expense Form */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">إضافة مصروف جديد</h4>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="وصف المصروف (مثال: شراء بسكويت 5 قطع)"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="المبلغ"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
              </div>
              <Button
                onClick={async () => {
                  if (expenseDescription.trim() && parseFloat(expenseAmount) > 0) {
                    await addExpense(expenseDescription.trim(), parseFloat(expenseAmount));
                    setExpenseDescription('');
                    setExpenseAmount('');
                  }
                }}
                disabled={!expenseDescription.trim() || !parseFloat(expenseAmount)}
              >
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </div>
          </div>

          {/* Expenses List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد مصروفات اليوم</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(expense.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-600">{formatCurrency(expense.amount)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(expense.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Total */}
          {expenses.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">إجمالي المصروفات:</span>
                <span className="text-xl font-bold text-red-600">{formatCurrency(todayExpensesTotal)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * المصروفات للرؤية فقط ولا تؤثر على المخزون أو الأرباح. تُستخدم لتوثيق المصاريف عند تسليم الشيفت.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Daily Stats Modal (for mobile/expanded view) */}
      <Modal
        isOpen={showDailyStatsModal}
        onClose={() => setShowDailyStatsModal(false)}
        title={`اليومية - ${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`}
        size="lg"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-right py-3 px-3 font-medium text-gray-600">اليوم</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">المبيعات</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">صافي الربح</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">الفواتير</th>
                <th className="text-right py-3 px-3 font-medium text-gray-600">الأصناف</th>
              </tr>
            </thead>
            <tbody>
              {monthlyDailyStats.map((day) => (
                <tr key={day.date} className={cn(
                  "border-b border-gray-100 hover:bg-gray-50 transition-colors",
                  day.date === new Date().toISOString().split('T')[0] && "bg-blue-50 font-medium"
                )}>
                  <td className="py-3 px-3 text-gray-700">
                    {day.date === new Date().toISOString().split('T')[0] ? (
                      <span className="text-blue-600 font-bold">اليوم ({day.dayLabel})</span>
                    ) : (
                      day.dayLabel
                    )}
                  </td>
                  <td className="py-3 px-3 font-medium text-gray-900">{formatCurrency(day.revenue)}</td>
                  <td className="py-3 px-3 font-medium text-green-600">{formatCurrency(day.profit)}</td>
                  <td className="py-3 px-3 text-gray-700">{day.invoiceCount}</td>
                  <td className="py-3 px-3 text-gray-700">{day.items}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="py-3 px-3 text-gray-700">إجمالي الشهر</td>
                <td className="py-3 px-3 text-gray-900">{formatCurrency(monthlyDailyStats.reduce((s, d) => s + d.revenue, 0))}</td>
                <td className="py-3 px-3 text-green-600">{formatCurrency(monthlyDailyStats.reduce((s, d) => s + d.profit, 0))}</td>
                <td className="py-3 px-3 text-gray-700">{monthlyDailyStats.reduce((s, d) => s + d.invoiceCount, 0)}</td>
                <td className="py-3 px-3 text-gray-700">{monthlyDailyStats.reduce((s, d) => s + d.items, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>

      {/* Low Stock Products Modal */}
      <Modal
        isOpen={showLowStockModal}
        onClose={() => setShowLowStockModal(false)}
        title="المنتجات المنخفضة المخزون"
      >
        <div className="space-y-4">
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-700">
                {lowStockProducts.length} منتج وصلت للحد الأدنى أو أقل
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="p-4 border border-red-200 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    {product.category && (
                      <p className="text-sm text-gray-600">{product.category}</p>
                    )}
                    {product.barcode && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Barcode className="w-3 h-3" />
                        {product.barcode}
                      </p>
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded-full">
                        متبقي: {product.stock} {product.unit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      الحد الأدنى: {product.minStock}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-red-200 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">سعر الشراء:</span>
                    <span className="font-medium mr-1">{formatCurrency(product.costPrice)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">سعر البيع:</span>
                    <span className="font-medium mr-1">{formatCurrency(product.sellingPrice)}</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 text-xs border border-gray-300"
                    onClick={() => {
                      setEditingProduct(product);
                      setShowLowStockModal(false);
                      setShowProductModal(true);
                    }}
                  >
                    تعديل المنتج
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setShowLowStockModal(false);
                      cart.addItem(product);
                      setActiveTab('sales');
                    }}
                  >
                    إضافة للفاتورة
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full border border-gray-300"
              onClick={() => setShowLowStockModal(false)}
            >
              إغلاق
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false);
          setOldPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          setChangePasswordError('');
          setChangePasswordSuccess(false);
        }}
        title="تغيير كلمة السر"
        size="sm"
      >
        <div className="space-y-4">
          {changePasswordSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-700 mb-2">تم تغيير كلمة السر بنجاح ✅</p>
              <p className="text-sm text-gray-500">أي جهاز تاني هيحتاج يسجل دخول بالكلمة الجديدة</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangePasswordSuccess(false);
                }}
              >
                تم
              </Button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة السر الحالية</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => { setOldPassword(e.target.value); setChangePasswordError(''); }}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 text-sm border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة السر الجديدة</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setChangePasswordError(''); }}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 text-sm border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">تأكيد كلمة السر الجديدة</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => { setConfirmNewPassword(e.target.value); setChangePasswordError(''); }}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 text-sm border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {changePasswordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-center">
                  {changePasswordError}
                </div>
              )}

              <Button
                className="w-full"
                onClick={async () => {
                  if (!oldPassword || !newPassword || !confirmNewPassword) {
                    setChangePasswordError('ادخل كل الحقول');
                    return;
                  }
                  if (newPassword.length < 4) {
                    setChangePasswordError('كلمة السر لازم تكون 4 حروف على الأقل');
                    return;
                  }
                  if (newPassword !== confirmNewPassword) {
                    setChangePasswordError('كلمة السر الجديدة مش متطابقة');
                    return;
                  }
                  try {
                    const res = await fetch('/api/auth', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'change', oldPassword, password: newPassword }),
                    });
                    const data = await res.json();
                    if (data.success && data.token) {
                      localStorage.setItem('kstore_auth_token', data.token);
                      // Update cached hash for offline login
                      try {
                        const { clientHashPassword } = await import('@/components/auth/AuthProvider');
                        const hash = await clientHashPassword(newPassword);
                        localStorage.setItem('kstore_cached_hash', hash);
                      } catch {}
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setChangePasswordSuccess(true);
                    } else {
                      setChangePasswordError(data.error || 'حصل خطأ');
                    }
                  } catch {
                    setChangePasswordError('خطأ في الاتصال بالسيرفر');
                  }
                }}
              >
                <KeyRound className="w-4 h-4" />
                تغيير كلمة السر
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  trend,
  subtext,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  subtext?: string;
}) {
  return (
    <Card className="border-gray-200 hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold mb-1 text-gray-800">{value}</p>
        {trend && <p className="text-sm text-green-600">{trend}</p>}
        {subtext && <p className="text-sm text-blue-600">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
// Product Card Component
function ProductCard({
  product,
  onAddToCart,
  onEdit,
  onDelete,
  showStock = true,
}: {
  product: any;
  onAddToCart?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showStock?: boolean;
}) {
  const isLowStock = product.stock <= product.minStock;

  return (
    <Card variant="bordered" className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800">
              {product.name}
            </h3>
            {product.category && (
              <p className="text-sm text-gray-500">{product.category}</p>
            )}
          </div>
          {isLowStock && (
            <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
              منخفض
            </span>
          )}
        </div>

        {product.barcode && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Barcode className="w-4 h-4" />
            {product.barcode}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">سعر البيع</p>
            <p className="font-bold text-blue-600">
              {formatCurrency(product.sellingPrice)}
            </p>
          </div>
          {showStock && (
            <div className="text-left">
              <p className="text-xs text-gray-500">المخزون</p>
              <p className={cn(
                'font-bold',
                isLowStock ? 'text-red-600' : 'text-green-600'
              )}>
                {product.stock} {product.unit}
              </p>
            </div>
          )}
        </div>

        {onAddToCart && (
          <Button
            className="w-full"
            size="sm"
            onClick={onAddToCart}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? 'غير متوفر' : 'إضافة للسلة'}
          </Button>
        )}
        
        {(onEdit || onDelete) && (
          <div className="flex gap-2 mt-2">
            {onEdit && (
              <Button
                className="flex-1"
                size="sm"
                variant="ghost"
                onClick={onEdit}
              >
                تعديل
              </Button>
            )}
            {onDelete && (
              <Button
                className="flex-1"
                size="sm"
                variant="ghost"
                onClick={onDelete}
              >
                حذف
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
