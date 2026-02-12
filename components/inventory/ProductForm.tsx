'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Barcode, Package } from 'lucide-react';
import { Product } from '@/lib/db/schema';

interface ProductFormProps {
  onSubmit: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onCancel: () => void;
  product?: Product;
  scannedBarcode?: string;
}

export function ProductForm({ onSubmit, onCancel, product, scannedBarcode }: ProductFormProps) {
  // Separate states for pounds and piasters
  const [costPounds, setCostPounds] = useState(product ? Math.floor(product.costPrice) : '');
  const [costPiasters, setCostPiasters] = useState(product ? Math.round((product.costPrice - Math.floor(product.costPrice)) * 100) : '');
  const [sellingPounds, setSellingPounds] = useState(product ? Math.floor(product.sellingPrice) : '');
  const [sellingPiasters, setSellingPiasters] = useState(product ? Math.round((product.sellingPrice - Math.floor(product.sellingPrice)) * 100) : '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    defaultValues: product ? {
      ...product
    } : {
      barcode: scannedBarcode || '',
      name: '',
      description: null,
      category: null,
      costPrice: undefined,
      sellingPrice: undefined,
      stock: undefined,
      minStock: 5,
      unit: 'قطعة',
    },
  });

  useEffect(() => {
    if (scannedBarcode) {
      setValue('barcode', scannedBarcode);
    }
  }, [scannedBarcode, setValue]);

  // Calculate full prices
  const costPrice = Number(costPounds || 0) + Number(costPiasters || 0) / 100;
  const sellingPrice = Number(sellingPounds || 0) + Number(sellingPiasters || 0) / 100;
  const profit = sellingPrice - costPrice;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  const handleFormSubmit = (data: any) => {
    // Combine pounds and piasters into full price
    const finalData = {
      ...data,
      costPrice,
      sellingPrice,
    };
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Barcode */}
        <div className="md:col-span-2">
          <Input
            label="الباركود (اختياري)"
            placeholder="امسح أو أدخل الباركود"
            startIcon={<Barcode className="w-4 h-4" />}
            data-barcode-input="true"
            {...register('barcode')}
          />
        </div>

        {/* Name */}
        <div className="md:col-span-2">
          <Input
            label="اسم المنتج *"
            placeholder="أدخل اسم المنتج"
            startIcon={<Package className="w-4 h-4" />}
            error={errors.name?.message}
            {...register('name', { required: 'اسم المنتج مطلوب' })}
          />
        </div>

        {/* Cost Price - Pounds and Piasters */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">سعر التكلفة *</label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              placeholder="الجنيهات"
              value={costPounds}
              onChange={(e) => setCostPounds(e.target.value)}
              label="جنيه"
            />
            <Input
              type="number"
              min="0"
              max="99"
              placeholder="القروش"
              value={costPiasters}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setCostPiasters(Math.min(99, Math.max(0, val)).toString());
              }}
              label="قرش"
            />
          </div>
        </div>

        {/* Selling Price - Pounds and Piasters */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">سعر البيع *</label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              placeholder="الجنيهات"
              value={sellingPounds}
              onChange={(e) => setSellingPounds(e.target.value)}
              label="جنيه"
            />
            <Input
              type="number"
              min="0"
              max="99"
              placeholder="القروش"
              value={sellingPiasters}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 0;
                setSellingPiasters(Math.min(99, Math.max(0, val)).toString());
              }}
              label="قرش"
            />
          </div>
        </div>

        {/* Stock */}
        <div>
          <Input
            label="الكمية في المخزون"
            type="number"
            min="0"
            placeholder="0"
            {...register('stock', { valueAsNumber: true, min: 0 })}
          />
        </div>

        {/* Min Stock */}
        <div>
          <Input
            label="الحد الأدنى للمخزون"
            type="number"
            min="0"
            placeholder="5"
            {...register('minStock', { valueAsNumber: true, min: 0 })}
          />
        </div>
      </div>

      {/* Profit Preview */}
      {sellingPrice > 0 && costPrice > 0 && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">هامش الربح:</span>
            <span className={profit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {formatCurrency(profit)} ({profitMargin.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit">
          {product ? 'تحديث المنتج' : 'إضافة المنتج'}
        </Button>
      </div>
    </form>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
}
