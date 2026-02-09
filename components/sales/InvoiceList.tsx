'use client';

import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Receipt, Eye, Trash2, DollarSign, Calendar, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/Modal';
import { useState, useMemo } from 'react';
import { useGlobalStore } from '@/lib/stores/global-store';
import { Invoice } from '@/lib/db/schema';

interface InvoiceListProps {
  compact?: boolean;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function InvoiceList({ compact = false }: InvoiceListProps) {
  const { invoices, removeInvoice } = useGlobalStore();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Filter and sort invoices by date (newest first)
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const filtered = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt);
      
      switch (dateFilter) {
        case 'today':
          return invoiceDate >= today;
        
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return invoiceDate >= yesterday && invoiceDate < today;
        
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return invoiceDate >= weekAgo;
        
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return invoiceDate >= monthAgo;
        
        case 'custom':
          if (!customStartDate && !customEndDate) return true;
          
          const start = customStartDate ? new Date(customStartDate) : new Date(0);
          const end = customEndDate ? new Date(customEndDate) : new Date();
          end.setHours(23, 59, 59, 999);
          
          return invoiceDate >= start && invoiceDate <= end;
        
        default:
          return true;
      }
    });

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, dateFilter, customStartDate, customEndDate]);

  const displayedInvoices = compact ? filteredInvoices.slice(0, 3) : filteredInvoices;

  const handleDelete = () => {
    if (invoiceToDelete) {
      removeInvoice(invoiceToDelete);
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
      setSelectedInvoice(null); // Close the invoice detail modal
    }
  };

  return (
    <>
      {/* Date Filter - Only show when not compact */}
      {!compact && (
        <Card className="border-gray-200 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="font-medium text-gray-900">تصفية حسب التاريخ</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
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
                آخر أسبوع
              </Button>
              <Button
                size="sm"
                variant={dateFilter === 'month' ? 'primary' : 'ghost'}
                onClick={() => setDateFilter('month')}
              >
                آخر شهر
              </Button>
              <Button
                size="sm"
                variant={dateFilter === 'custom' ? 'primary' : 'ghost'}
                onClick={() => setDateFilter('custom')}
              >
                تاريخ محدد
              </Button>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <Input
                  type="date"
                  label="من تاريخ"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  label="إلى تاريخ"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            )}

            {/* Summary */}
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                عدد الفواتير: <span className="font-bold text-gray-900">{filteredInvoices.length}</span>
              </span>
              <span className="text-gray-600">
                الإجمالي: <span className="font-bold text-green-600">
                  {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + inv.total, 0))}
                </span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {displayedInvoices.length === 0 ? (
        <Card className="border-gray-200">
          <CardContent className="py-8 text-center">
            <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد مبيعات بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedInvoices.map((invoice) => (
            <Card
              key={invoice.id}
              variant="bordered"
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        #{invoice.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(invoice.createdAt)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-gray-500">
                        {invoice.items.length} صنف
                      </span>
                      <span className="text-gray-500">•</span>
                      <span>
                        {invoice.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
                      </span>
                    </div>
                  </div>

                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(invoice.total)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title="تفاصيل الفاتورة"
        size="lg"
      >
        {selectedInvoice && (
          <div id="invoice-print-area" className="invoice-print-content space-y-4 print:space-y-6">
            {/* Header */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 print:bg-white print:border-2 print:border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2 print:text-3xl">KStore</h2>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-gray-400 print:hidden" />
                    <span className="text-sm text-gray-500 print:text-base print:text-black">
                      فاتورة #{selectedInvoice.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 print:text-base print:text-black">
                    {formatDate(selectedInvoice.createdAt)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-gray-900 print:text-3xl">
                    {formatCurrency(selectedInvoice.total)}
                  </p>
                  <p className="text-sm text-gray-500 print:text-base print:text-black">
                    {selectedInvoice.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="print:mt-6">
              <h4 className="font-medium mb-2 text-gray-900 print:text-xl print:mb-4">الأصناف</h4>
              <div className="space-y-2">
                {selectedInvoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 print:bg-white print:border-b print:border-gray-300 print:rounded-none print:p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900 print:text-lg">{item.productName}</p>
                      <p className="text-sm text-gray-500 print:text-base print:text-black">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900 print:text-lg">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200 print:border-t-2 print:border-gray-800 print:pt-6">
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-sm print:text-base">
                  <span className="text-gray-600 print:text-black">الخصم:</span>
                  <span className="text-red-600 font-medium print:text-black">
                    -{formatCurrency(selectedInvoice.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 print:text-2xl">
                <span>الإجمالي:</span>
                <span>{formatCurrency(selectedInvoice.total)}</span>
              </div>
            </div>

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 print:bg-white print:border print:border-gray-300">
                <p className="text-sm text-gray-700 print:text-base print:text-black">
                  <span className="font-medium">ملاحظات:</span> {selectedInvoice.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  setInvoiceToDelete(selectedInvoice.id);
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="w-4 h-4 ml-2" />
                حذف الفاتورة
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="تأكيد حذف الفاتورة"
        message="هل أنت متأكد من حذف هذه الفاتورة؟ سيتم استرجاع الكميات للمخزون."
        variant="danger"
      />
    </>
  );
}
