'use client';

import { formatCurrency, formatDate } from '@/lib/utils/cn';
import { Receipt, Eye, Trash2, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { ConfirmDialog } from '@/components/common/Modal';
import { useState } from 'react';
import { useGlobalStore } from '@/lib/stores/global-store';
import { Invoice } from '@/lib/db/schema';

interface InvoiceListProps {
  compact?: boolean;
}

export function InvoiceList({ compact = false }: InvoiceListProps) {
  const { invoices, removeInvoice } = useGlobalStore();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const displayedInvoices = compact ? invoices.slice(0, 3) : invoices;

  const handleDelete = () => {
    if (invoiceToDelete) {
      removeInvoice(invoiceToDelete);
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
    }
  };

  return (
    <>
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
          <div className="space-y-4">
            {/* Header */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      #{selectedInvoice.id.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedInvoice.createdAt)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedInvoice.total)}
                  </p>
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
                {selectedInvoice.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-bold text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الخصم:</span>
                  <span className="text-red-600 font-medium">
                    -{formatCurrency(selectedInvoice.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>الإجمالي:</span>
                <span>{formatCurrency(selectedInvoice.total)}</span>
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
              <Button
                variant="secondary"
                onClick={() => window.print()}
              >
                طباعة
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
