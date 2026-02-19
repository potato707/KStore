'use client';

import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Receipt, DollarSign, Calendar, Undo2, Edit3, Save, X } from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/Modal';
import { useState, useMemo } from 'react';
import { useGlobalStore } from '@/lib/stores/global-store';
import { Invoice, InvoiceItem } from '@/lib/db/schema';

interface InvoiceListProps {
  compact?: boolean;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export function InvoiceList({ compact = false }: InvoiceListProps) {
  const { invoices, returnInvoice, editInvoice, products } = useGlobalStore();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const [invoiceToReturn, setInvoiceToReturn] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Edit invoice state
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<InvoiceItem[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, dateFilter, customStartDate, customEndDate]);

  const displayedInvoices = compact ? filteredInvoices.slice(0, 3) : filteredInvoices;

  const handleReturn = () => {
    if (invoiceToReturn) {
      returnInvoice(invoiceToReturn);
      setShowReturnConfirm(false);
      setInvoiceToReturn(null);
      setSelectedInvoice(null);
    }
  };

  const startEditing = (invoice: Invoice) => {
    setEditItems(invoice.items.map(item => ({ ...item })));
    setEditDiscount(invoice.discount || 0);
    setEditNotes(invoice.notes || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditItems([]);
    setEditDiscount(0);
    setEditNotes('');
  };

  const updateEditItemQuantity = (itemIdx: number, newQty: number) => {
    setEditItems(items =>
      items.map((item, i) => {
        if (i === itemIdx) {
          const qty = Math.max(1, newQty);
          return { ...item, quantity: qty, totalPrice: item.unitPrice * qty };
        }
        return item;
      })
    );
  };

  const removeEditItem = (itemIdx: number) => {
    setEditItems(items => items.filter((_, i) => i !== itemIdx));
  };

  const editSubtotal = editItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const editTotal = Math.max(0, editSubtotal - editDiscount);

  const handleSaveEdit = async () => {
    if (!selectedInvoice || editItems.length === 0) return;
    setIsSaving(true);
    
    try {
      const subtotal = editItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const total = Math.max(0, subtotal - editDiscount);
      const paidAmount = Math.min(selectedInvoice.paidAmount, total);
      const remainingBalance = Math.max(0, total - paidAmount);
      const status: 'paid' | 'partial' | 'unpaid' = remainingBalance <= 0 ? 'paid' : 'partial';

      const success = await editInvoice(selectedInvoice.id, {
        items: editItems,
        subtotal,
        discount: editDiscount,
        total,
        paidAmount,
        remainingBalance,
        status,
        notes: editNotes || null,
      });

      if (success) {
        setIsEditing(false);
        setSelectedInvoice(null);
      }
    } catch (error) {
      console.error('Failed to save invoice edit:', error);
    } finally {
      setIsSaving(false);
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
              <Button size="sm" variant={dateFilter === 'all' ? 'primary' : 'ghost'} onClick={() => setDateFilter('all')}>الكل</Button>
              <Button size="sm" variant={dateFilter === 'today' ? 'primary' : 'ghost'} onClick={() => setDateFilter('today')}>اليوم</Button>
              <Button size="sm" variant={dateFilter === 'yesterday' ? 'primary' : 'ghost'} onClick={() => setDateFilter('yesterday')}>أمس</Button>
              <Button size="sm" variant={dateFilter === 'week' ? 'primary' : 'ghost'} onClick={() => setDateFilter('week')}>آخر أسبوع</Button>
              <Button size="sm" variant={dateFilter === 'month' ? 'primary' : 'ghost'} onClick={() => setDateFilter('month')}>آخر شهر</Button>
              <Button size="sm" variant={dateFilter === 'custom' ? 'primary' : 'ghost'} onClick={() => setDateFilter('custom')}>تاريخ محدد</Button>
            </div>

            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <Input type="date" label="من تاريخ" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                <Input type="date" label="إلى تاريخ" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
              </div>
            )}

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
              onClick={() => { setSelectedInvoice(invoice); setIsEditing(false); }}
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
                    <p className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-gray-500">{invoice.items.length} صنف</span>
                      <span className="text-gray-500">•</span>
                      <span>{invoice.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}</span>
                      {invoice.discount > 0 && (
                        <>
                          <span className="text-gray-500">•</span>
                          <span className="text-red-600">خصم {formatCurrency(invoice.discount)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice Detail / Edit Modal */}
      <Modal
        isOpen={!!selectedInvoice}
        onClose={() => { setSelectedInvoice(null); setIsEditing(false); }}
        title={isEditing ? 'تعديل الفاتورة' : 'تفاصيل الفاتورة'}
        size="lg"
      >
        {selectedInvoice && !isEditing && (
          <div className="invoice-print-content space-y-4">
            {/* Header */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">KStore</h2>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      فاتورة #{selectedInvoice.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{formatDate(selectedInvoice.createdAt)}</p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedInvoice.total)}</p>
                  <p className="text-sm text-gray-500">
                    {selectedInvoice.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-medium mb-2 text-gray-900">الأصناف</h4>
              <div className="space-y-2">
                {selectedInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              {selectedInvoice.discount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">المجموع الفرعي:</span>
                    <span className="text-gray-900">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">الخصم:</span>
                    <span className="text-red-600 font-medium">-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>الإجمالي:</span>
                <span>{formatCurrency(selectedInvoice.total)}</span>
              </div>
              {/* Net Profit */}
              <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-600">صافي الربح (Net Profit):</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(
                    selectedInvoice.items.reduce((s, item) => s + (item.unitPrice - item.costPrice) * item.quantity, 0) - (selectedInvoice.discount || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">ملاحظات:</span> {selectedInvoice.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => startEditing(selectedInvoice)}
              >
                <Edit3 className="w-4 h-4 ml-2" />
                تعديل الفاتورة
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setInvoiceToReturn(selectedInvoice.id);
                  setShowReturnConfirm(true);
                }}
              >
                <Undo2 className="w-4 h-4 ml-2" />
                ترجيع الفاتورة
              </Button>
            </div>
          </div>
        )}

        {/* Edit Mode */}
        {selectedInvoice && isEditing && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                ⚠️ تعديل فاتورة #{selectedInvoice.id.slice(-6).toUpperCase()} - التعديلات ستؤثر على المخزون والأرباح
              </p>
            </div>

            {/* Edit Items */}
            <div>
              <h4 className="font-medium mb-2 text-gray-900">الأصناف</h4>
              <div className="space-y-2">
                {editItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">سعر: {formatCurrency(item.unitPrice)} | تكلفة: {formatCurrency(item.costPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 border"
                        onClick={() => updateEditItemQuantity(idx, item.quantity - 1)}
                      >-</button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateEditItemQuantity(idx, parseInt(e.target.value) || 1)}
                        className="w-14 h-8 text-center text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 border"
                        onClick={() => updateEditItemQuantity(idx, item.quantity + 1)}
                      >+</button>
                    </div>
                    <p className="text-sm font-bold w-20 text-left">{formatCurrency(item.totalPrice)}</p>
                    {editItems.length > 1 && (
                      <button
                        className="text-red-500 hover:text-red-700 p-1"
                        onClick={() => removeEditItem(idx)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Discount */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">الخصم (جنيه)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={editDiscount || ''}
                onChange={(e) => setEditDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Edit Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">ملاحظات</label>
              <Input
                placeholder="ملاحظات إضافية..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {/* Edit Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="text-gray-900">{formatCurrency(editSubtotal)}</span>
              </div>
              {editDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الخصم:</span>
                  <span className="text-red-600">-{formatCurrency(editDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>الإجمالي:</span>
                <span>{formatCurrency(editTotal)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-600">صافي الربح المتوقع:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(
                    editItems.reduce((s, item) => s + (item.unitPrice - item.costPrice) * item.quantity, 0) - editDiscount
                  )}
                </span>
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSaveEdit}
                disabled={isSaving || editItems.length === 0}
              >
                <Save className="w-4 h-4 ml-2" />
                {isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
              <Button
                variant="ghost"
                className="flex-1 border border-gray-300"
                onClick={cancelEditing}
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return Confirmation */}
      <ConfirmDialog
        isOpen={showReturnConfirm}
        onClose={() => setShowReturnConfirm(false)}
        onConfirm={handleReturn}
        title="تأكيد ترجيع الفاتورة"
        message="هل أنت متأكد من ترجيع هذه الفاتورة؟ سيتم استرجاع الكميات للمخزون وإلغاء الربح من الإحصائيات."
        variant="info"
      />
    </>
  );
}
