'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, MessageCircle, LogOut, User, ChevronDown, Utensils, HeartPulse, Baby } from 'lucide-react';
import { isAuthenticated, getUserData, clearAuth } from '@/utils/auth';
import AppNavbar from '@/components/common/AppNavbar';

export default function OrangTuaDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return; }
    const ud = getUserData();
    if (ud?.role !== 'orang_tua') { router.replace('/login'); return; }
    setUserData(ud);
  }, []);

  useEffect(() => {
    function handleOutside(e) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target))
        setProfileDropdownOpen(false);
    }
    if (profileDropdownOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [profileDropdownOpen]);

  const handleLogout = async () => { await clearAuth(); router.replace('/login'); };

  if (!userData) return null;

  const firstName = userData.nama?.split(' ')[0] || 'Bunda';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col mesh-bg bg-orbs relative">
      {/* Decorative floating blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-teal-400/[0.05] rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-sky-400/[0.04] rounded-full blur-[120px] animate-float-slow-reverse" />
        <div className="absolute -bottom-32 right-1/3 w-72 h-72 bg-emerald-400/[0.03] rounded-full blur-[100px] animate-float-slow" />
      </div>
      {/* Floating Pill Navbar */}
      <AppNavbar maxWidth="max-w-5xl">
          <Link href="/" className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight hidden sm:block">Growell</span>
          </Link>
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {(userData?.nama || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:block">{firstName}</span>
              <ChevronDown size={13} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                <div className="p-1.5">
                  <button onClick={() => { setProfileDropdownOpen(false); router.push('/profile'); }}
                    className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 transition font-medium">
                    <User size={15} className="text-teal-500" /> Profil Saya
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button onClick={handleLogout}
                    className="w-full px-3 py-2.5 text-left rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 transition font-medium">
                    <LogOut size={15} /> Keluar
                  </button>
                </div>
              </div>
            )}
          </div>
      </AppNavbar>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">

        {/* Greeting */}
        <div className="mb-8 section-appear">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Halo, <span className="gradient-text-static">{firstName}</span> 👋
          </h1>
          <p className="text-gray-500 mt-2 text-sm sm:text-base">Pantau tumbuh kembang si kecil dan konsultasikan kebutuhan gizi bersama ahli kami.</p>
        </div>

        {/* Main Action Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 section-appear section-appear-delay-1">
          <Link href="/orang-tua/kuesioner"
            className="group card-3d card-shine bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-2xl hover:border-teal-200 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-teal-50 rounded-full blur-2xl group-hover:bg-teal-100 transition-colors" />
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-sky-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-teal-500/20 relative z-10 group-hover:scale-105 transition-transform">
              <ClipboardList className="text-white" size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Isi Kuesioner Balita</h3>
            <p className="text-sm text-gray-500 leading-relaxed relative z-10">
              Catat data riwayat kesehatan, gizi, dan lingkungan hidup si kecil. Dipadukan sistem AI untuk menghasilkan prediksi status gizi yang akurat.
            </p>
            <div className="mt-5 inline-flex items-center text-sm font-semibold text-teal-600 group-hover:text-teal-700 relative z-10">
              Isi Kuesioner
              <span className="ml-1.5 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </Link>

          <Link href="/konsultasi"
            className="group card-3d card-shine bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-2xl hover:border-emerald-200 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors" />
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 relative z-10 group-hover:scale-105 transition-transform">
              <MessageCircle className="text-white" size={22} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 relative z-10">Konsultasi Ahli Gizi</h3>
            <p className="text-sm text-gray-500 leading-relaxed relative z-10">
              Tanyakan masalah asupan makan, berat badan, atau gangguan pertumbuhan langsung ke Ahli Gizi terverifikasi — kapan saja dan di mana saja.
            </p>
            <div className="mt-5 inline-flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 relative z-10">
              Mulai Konsultasi
              <span className="ml-1.5 group-hover:translate-x-1 transition-transform inline-block">→</span>
            </div>
          </Link>
        </div>

        {/* Edukasi Section */}
        <div className="mt-12 section-appear section-appear-delay-2">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-gray-900">Tips Gizi & Tumbuh Kembang</h2>
            <p className="text-sm text-gray-500 mt-1">Panduan ringkas untuk mendukung pertumbuhan balita yang optimal.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 stagger-grid">
            {[
              {
                bg: 'bg-orange-50', icon: <Utensils className="text-orange-500" size={18} />,
                title: 'Isi Piringku (MP-ASI)',
                desc: 'Penuhi gizi balita dengan porsi seimbang: karbohidrat, protein hewani (telur/ikan/ayam), lemak sehat, serta buah & sayur warna-warni setiap hari.'
              },
              {
                bg: 'bg-pink-50', icon: <HeartPulse className="text-pink-500" size={18} />,
                title: 'Pola Asuh Responsif',
                desc: 'Jangan paksa anak makan. Ciptakan jadwal makan teratur dengan suasana yang menyenangkan dan biarkan anak mengenal makanan dengan eksplorasi.'
              },
              {
                bg: 'bg-sky-50', icon: <Baby className="text-sky-500" size={18} />,
                title: 'Sanitasi & Kebersihan',
                desc: 'Selalu cuci tangan menggunakan sabun sebelum memberi makan anak. Kebersihan lingkungan mencegah diare dan penyakit yang merusak status gizi.'
              },
            ].map((card, i) => (
              <div key={i} className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-5 hover:border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 card-shine">
                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
                  {card.icon}
                </div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">{card.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
