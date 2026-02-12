import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  const pounds = Math.floor(amount);
  const piasters = Math.round((amount - pounds) * 100);
  
  if (piasters === 0) {
    return `${pounds} ج`;
  }
  return `${pounds} ج و ${piasters} ق`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getInvoiceStatusText(status: string): string {
  switch (status) {
    case 'paid':
      return 'مدفوعة';
    case 'partial':
      return 'مدفوعة جزئياً';
    case 'unpaid':
      return 'غير مدفوعة';
    default:
      return status;
  }
}

export function getPaymentMethodText(method: string): string {
  switch (method) {
    case 'cash':
      return 'نقدي';
    case 'card':
      return 'بطاقة';
    case 'credit':
      return 'آجل';
    case 'partial':
      return 'جزئي';
    default:
      return method;
  }
}
