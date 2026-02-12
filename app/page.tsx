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
  Wifi,
  WifiOff,
  AlertCircle,
  RefreshCw,
  DollarSign,
  Box,
  Receipt,
  ArrowRight,
} from 'lucide-react';
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

type Tab = 'dashboard' | 'inventory' | 'sales';

export default function HomePage() {
  const {
    products,
    invoices,
    lowStockProducts,
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

  const cart = useCartStore();
  const { syncPending } = useOfflineSync();

  // Track modal state
  useEffect(() => {
    setIsAnyModalOpen(showProductModal);
  }, [showProductModal]);

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
    onScan: (barcode) => {
      const product = products.find(p => p.barcode === barcode);
      if (product) {
        cart.addItem(product);
      } else {
        // Product not found - show product modal with barcode
        setScannedProduct({ barcode, notFound: true });
        setShowProductModal(true);
      }
    },
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

          <div className="flex items-center gap-4">
            {/* Online Status */}
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
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
          </div>
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
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="مبيعات اليوم"
                value={formatCurrency(todayRevenue)}
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                trend={`${todayInvoices} عملية`}
              />
              <StatCard
                title="ربح اليوم"
                value={formatCurrency(todayProfit)}
                icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
              />
              <div onClick={() => setShowTodayItemsModal(true)} className="cursor-pointer">
                <StatCard
                  title="عدد الأصناف المباعة"
                  value={todayItems.toString()}
                  icon={<Box className="w-5 h-5 text-purple-600" />}
                  subtext="اضغط للتفاصيل"
                />
              </div>
              <StatCard
                title="عدد المنتجات"
                value={products.length.toString()}
                icon={<Package className="w-5 h-5 text-orange-600" />}
                subtext={`${lowStockProducts.length} منخفض المخزون`}
              />
            </div>

            {/* Recent Invoices */}
            <Card className="border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>آخر المبيعات</CardTitle>
                  <CardDescription>أحدث عمليات البيع</CardDescription>
                </div>
                <Link href="/sales">
                  <Button variant="ghost" size="sm">
                    عرض الكل
                    <ArrowRight className="w-4 h-4 mr-2" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">لا توجد مبيعات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {[...invoices]
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)
                      .map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm text-gray-500">
                            {formatDate(invoice.createdAt)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {invoice.items.length} صنف • {invoice.items.reduce((s, i) => s + i.quantity, 0)} قطعة
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-gray-800">{formatCurrency(invoice.total)}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
    </div>
  );
}

// Tab Button Component
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
