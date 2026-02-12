'use client';

import { useState } from 'react';
import { Trash2, Receipt, CreditCard, DollarSign, Wallet } from 'lucide-react';
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

  const handleQuantityChange = (productId: string, newQty: string) => {
    const qty = parseInt(newQty);
    
    // If empty or NaN, don't update (let user type)
    if (newQty === '' || isNaN(qty)) {
      return;
    }
    
    const item = items.find(i => i.product.id === productId);
    if (item) {
      // If quantity is 0, remove item
      if (qty === 0) {
        removeItem(productId);
        return;
      }
      
      const validQty = Math.max(1, Math.min(qty, item.product.stock));
      updateQuantity(productId, validQty);
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
                    <button
                      className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={item.product.stock}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-12 h-8 text-center text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

          {/* Paid Amount */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">المبلغ المدفوع</label>
              <Input
                type="number"
                min="0"
                placeholder="اترك فارغ للدفع كامل"
                value={paidAmount || ''}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          {/* Summary */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>الإجمالي</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {/* Show change due if overpaid */}
            {changeDue > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">المتبقي للعميل:</span>
                  <span className="text-lg font-bold text-green-600">{formatCurrency(changeDue)}</span>
                </div>
              </div>
            )}

            {/* Show remaining debt if underpaid */}
            {paidAmount > 0 && paidAmount < total && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-800">المتبقي ليك:</span>
                  <span className="text-lg font-bold text-red-600">{formatCurrency(total - paidAmount)}</span>
                </div>
              </div>
            )}
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

            {paidAmount > 0 && paidAmount < total && (
              <div className="flex justify-between text-lg pt-2 border-t border-gray-200">
                <span className="text-red-700">المتبقي ليك:</span>
                <span className="font-bold text-red-600">{formatCurrency(total - paidAmount)}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500 text-center">
            نقدي
          </p>

          <Button className="w-full" onClick={handleCheckout}>
            تأكيد البيع
          </Button>
        </div>
      </Modal>
    </>
  );
}
