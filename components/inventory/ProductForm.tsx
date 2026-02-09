'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input, Textarea } from '@/components/common/Input';
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
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>({
    defaultValues: product || {
      barcode: scannedBarcode || '',
      name: '',
      description: '',
      category: '',
      costPrice: 0,
      sellingPrice: 0,
      stock: 0,
      minStock: 5,
      unit: 'قطعة',
    },
  });

  useEffect(() => {
    if (scannedBarcode) {
      setValue('barcode', scannedBarcode);
    }
  }, [scannedBarcode, setValue]);

  const sellingPrice = watch('sellingPrice');
  const costPrice = watch('costPrice');
  const profit = sellingPrice - costPrice;
  const profitMargin = sellingPrice > 0 ? (profit / sellingPrice) * 100 : 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        {/* Category */}
        <div>
          <Input
            label="الفئة (اختياري)"
            placeholder="مثال: أطعمة، مشروبات..."
            {...register('category')}
          />
        </div>

        {/* Unit */}
        <div>
          <Input
            label="الوحدة"
            {...register('unit')}
          />
        </div>

        {/* Cost Price */}
        <div>
          <Input
            label="سعر التكلفة *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.costPrice?.message}
            {...register('costPrice', {
              required: 'سعر التكلفة مطلوب',
              min: { value: 0, message: 'يجب أن يكون السعر أكبر من صفر' },
              valueAsNumber: true,
            })}
          />
        </div>

        {/* Selling Price */}
        <div>
          <Input
            label="سعر البيع *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            error={errors.sellingPrice?.message}
            {...register('sellingPrice', {
              required: 'سعر البيع مطلوب',
              min: { value: 0, message: 'يجب أن يكون السعر أكبر من صفر' },
              valueAsNumber: true,
            })}
          />
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

        {/* Description */}
        <div className="md:col-span-2">
          <Textarea
            label="الوصف (اختياري)"
            placeholder="وصف المنتج..."
            rows={3}
            {...register('description')}
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
