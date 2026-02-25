'use client';
import { ToastProvider } from '@/components/common/Toast';

export default function ClientProviders({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
