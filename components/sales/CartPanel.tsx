'use client';

import { useState } from 'react';
import { Trash2, Check, X, Receipt, CreditCard, DollarSign, Wallet } from 'lucide-react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useGlobalStore } from '@/lib/stores/global-store';
import { formatCurrency, cn } from '@/lib/utils/cn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';

export function CartPanel() {
  const {
    items,
    discount,
    paymentMethod,
    notes,
    paidAmount,
    updateQuantity,
    removeItem,
    clearCart,
    setDiscount,
    setPaymentMethod,
    setNotes,
    setPaidAmount,
    getSubtotal,
    getTotal,
    getItemCount,
    getChangeDue,
  } = useCartStore();

  const { addInvoice } = useGlobalStore();
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number>(0);

  const subtotal = getSubtotal();
  const total = getTotal();
  const itemCount = getItemCount();
  const changeDue = getChangeDue();

  const handleCheckout = () => {
    if (items.length === 0) return;

    const invoiceItems = items.map((item) => ({
      id: '',
      productId: item.product.id,
      productName: item.product.name,
      barcode: item.product.barcode,
      quantity: item.quantity,
      unitPrice: item.product.sellingPrice,
      totalPrice: item.product.sellingPrice * item.quantity,
      costPrice: item.product.costPrice,
    }));

    // Use paid amount if entered, otherwise use total
    const finalPaidAmount = paidAmount > 0 ? paidAmount : total;
    const remainingBalance = Math.max(0, total - finalPaidAmount);
    const status: 'paid' | 'partial' | 'unpaid' = remainingBalance <= 0 ? 'paid' : 'partial';

    addInvoice({
      customerId: null,
      customerName: '',
      items: invoiceItems,
      subtotal,
      discount,
      total,
      paidAmount: finalPaidAmount,
      remainingBalance,
      status,
      paymentMethod,
      notes,
    }).then(() => {
      clearCart();
      setShowCheckoutModal(false);
    });
  };

  const handleQuantityEdit = (productId: string, newQty: number) => {
    const validQty = Math.max(0, Math.min(newQty, items.find(i => i.product.id === productId)!.product.stock));
    updateQuantity(productId, validQty);
    setEditingId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, productId: string) => {
    if (e.key === 'Enter') {
      handleQuantityEdit(productId, editingQty);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <>
      <Card className="sticky top-24 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>سلة المشتريات</span>
            <span className="text-sm font-normal text-gray-500">
              {itemCount} منتج
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cart Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                السلة فارغة
                <br />
                <span className="text-sm">امسح باركود أو اضغط على منتج للإضافة</span>
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(item.product.sellingPrice)}
                    </p>
                  </div>

                  {/* Quantity Input */}
                  <div className="flex items-center gap-1">
                    {editingId === item.product.id ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          max={item.product.stock}
                          value={editingQty}
                          onChange={(e) => setEditingQty(parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyPress(e, item.product.id)}
                          className="w-16 h-8 text-center text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          autoFocus
                        />
                        <button
                          onClick={() => handleQuantityEdit(item.product.id, editingQty)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          readOnly
                          onClick={() => {
                            setEditingId(item.product.id);
                            setEditingQty(item.quantity);
                          }}
                          className="w-12 h-8 text-center text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded cursor-text hover:border-blue-300 focus:outline-none"
                        />
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
                          onClick={() =>
                            updateQuantity(
                              item.product.id,
                              Math.min(item.quantity + 1, item.product.stock)
                            )
                          }
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-sm font-bold w-20 text-left text-gray-900">
                    {formatCurrency(item.product.sellingPrice * item.quantity)}
                  </p>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Payment Amount (Customer Paid) */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">المبلغ المدفوع</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="المبلغ الذي دفعه العميل"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                startIcon={<Wallet className="w-4 h-4" />}
              />
            </div>
          )}

          {/* Change Due */}
          {items.length > 0 && paidAmount > 0 && changeDue > 0 && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">المتبقي للعميل:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}

          {/* Discount */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">الخصم</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Payment Method */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">طريقة الدفع</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all',
                    paymentMethod === 'cash'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">نقدي</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all',
                    paymentMethod === 'card'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  )}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">بطاقة</span>
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">ملاحظات</label>
              <Input
                placeholder="ملاحظات إضافية..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Summary */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm text-gray-600">
              <span>المجموع الفرعي</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>الخصم</span>
                <span className="font-medium">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>الإجمالي</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={items.length === 0}
            onClick={() => setShowCheckoutModal(true)}
          >
            <Receipt className="w-4 h-4" />
            إتمام البيع
          </Button>

          {items.length > 0 && (
            <Button
              variant="ghost"
              className="w-full text-red-600"
              onClick={clearCart}
            >
              مسح السلة
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Checkout Modal */}
      <Modal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        title="إتمام عملية البيع"
        size="sm"
      >
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">المجموع:</span>
              <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>

            {paidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">المدفوع:</span>
                <span className="font-medium text-gray-900">{formatCurrency(paidAmount)}</span>
              </div>
            )}

            {changeDue > 0 && (
              <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
                <span className="text-green-700">المتبقي للعميل:</span>
                <span className="font-bold text-green-600">{formatCurrency(changeDue)}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 text-center">
            {paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}
          </p>

          <Button className="w-full" onClick={handleCheckout}>
            تأكيد البيع
          </Button>
        </div>
      </Modal>
    </>
  );
}
