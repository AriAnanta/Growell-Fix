'use client';
import React from 'react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, onViewAll, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 text-center border border-gray-200 animate-scale-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={18} /></button>
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="text-emerald-500 w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1.5 tracking-tight">{title}</h3>
        <p className="text-sm text-gray-500 mb-8">{message}</p>
        <div className="space-y-2.5">
          <button onClick={onViewAll} className="w-full py-3 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 group">
            Lihat Semua Data
            <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button onClick={onClose} className="w-full py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            Input Data Baru
          </button>
        </div>
      </div>
    </div>
  );
}
