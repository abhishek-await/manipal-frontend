import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phoneNumber: string): string {
  // Format as XXX XXX XXXX
  const cleaned = phoneNumber.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `${match[1]} ${match[2]} ${match[3]}`;
  }
  
  return phoneNumber;
}

export function maskPhoneNumber(phoneNumber: string): string {
  // Show only last 4 digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length >= 4) {
    return `XXXXXX${cleaned.slice(-4)}`;
  }
  return phoneNumber;
}