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
import { formatCurrency, formatDate, cn } from '@/lib/utils/cn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/Modal';
import { ProductForm } from '@/components/inventory/ProductForm';
import { CartPanel } from '@/components/sales/CartPanel';
import { InvoiceList } from '@/components/sales/InvoiceList';

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

  const cart = useCartStore();

  // Track modal state
  useEffect(() => {
    setIsAnyModalOpen(showProductModal);
  }, [showProductModal]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
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
              onClick={loadData}
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
              <StatCard
                title="عدد الأصناف المباعة"
                value={todayItems.toString()}
                icon={<Box className="w-5 h-5 text-purple-600" />}
              />
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
            {/* Products List for Quick Add */}
            <div className="lg:col-span-2">
              <div className="flex gap-4 items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="مسح باركود أو بحث عن منتج..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-barcode-input="true"
                    className="pr-10"
                  />
                </div>
                <Button onClick={() => setShowProductModal(true)} variant="secondary">
                  <Plus className="w-4 h-4" />
                  منتج جديد
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => cart.addItem(product)}
                    showStock
                  />
                ))}
              </div>

              {/* Recent Invoices */}
              <div className="mt-6">
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
    <Card className="border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600">{title}</p>
          {icon}
        </div>
        <p className="text-2xl font-bold mb-1 text-gray-800">{value}</p>
        {trend && <p className="text-sm text-green-600">{trend}</p>}
        {subtext && <p className="text-sm text-gray-500">{subtext}</p>}
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
