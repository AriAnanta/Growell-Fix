'use client';
import { useState, useEffect } from 'react';

/**
 * AppNavbar — floating pill navbar (konsep sama seperti GrowellLanding)
 *
 * Perilaku:
 *   - Belum scroll : top-0, lebar penuh, flat di atas layar
 *   - Sudah scroll : top-3, mengecil jadi pill melayang, rounded + shadow
 *
 * Penggunaan:
 *   <AppNavbar maxWidth="max-w-7xl">
 *     <div>kiri</div>
 *     <div>kanan</div>
 *   </AppNavbar>
 *
 * Props:
 *   maxWidth — Tailwind max-w class untuk lebar pill saat scroll (default: max-w-7xl)
 */
export default function AppNavbar({ children, maxWidth = 'max-w-7xl' }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    // Set initial state in case page loads already scrolled
    setScrolled(window.scrollY > 20);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Spacer agar konten di bawah tidak tertutup navbar fixed */}
      <div className="h-[72px]" />

      <nav
        className={[
          'fixed left-1/2 -translate-x-1/2 z-40',
          'bg-white/95 backdrop-blur-xl',
          'px-4 sm:px-6 h-14',
          'flex items-center justify-between',
          'transition-all duration-500 ease-in-out',
          scrolled
            ? `top-3 w-[calc(100%-1.5rem)] ${maxWidth} rounded-2xl shadow-xl shadow-black/[0.08] border border-gray-100`
            : 'top-0 w-full rounded-none shadow-sm border-b border-gray-100',
        ].join(' ')}
      >
        {children}
      </nav>
    </>
  );
}
