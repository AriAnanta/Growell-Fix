import React from 'react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';

export default function SuccessModal({ isOpen, onClose, onViewAll, title, message }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform transition-all duration-300 animate-in zoom-in-95 slide-in-from-bottom-5">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
                >
                    <X size={20} />
                </button>

                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500 delay-150">
                    <CheckCircle2 className="text-green-600 w-10 h-10" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-8">{message}</p>

                <div className="space-y-3">
                    <button
                        onClick={onViewAll}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
                    >
                        Lihat Semua Data
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-gray-50 text-gray-700 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Input Data Baru
                    </button>
                </div>
            </div>
        </div>
    );
}
