import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
  }).format(amount);
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
