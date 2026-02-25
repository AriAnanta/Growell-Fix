import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, MessageCircle, LogOut, ChevronRight, BookOpen, HeartPulse, Utensils, Baby, Droplets, ShieldCheck, Sparkles } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const udStr = localStorage.getItem('user');
    if (!udStr) { navigate('/login'); return; }
    try {
      const ud = JSON.parse(udStr);
      if (ud?.role !== 'orang_tua') navigate('/login');
      else setUserData(ud);
    } catch { navigate('/login'); }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('growell_token');
    navigate('/login');
  };

  if (!userData) return null;

  const eduCards = [
    {
      icon: <Utensils size={20} />,
      title: 'Isi Piringku (MP-ASI)',
      body: 'Setiap kali makan, pastikan piring si kecil berisi karbohidrat (nasi/kentang), protein hewani (telur, ikan, ayam), sayur, dan sedikit buah. Variasi makanan kunci utama mencegah kekurangan gizi.',
      tip: 'Tip: Berikan protein hewani setiap hari — ini sumber zat besi dan zinc terbaik untuk tumbuh kembang otak.',
      color: '#ea580c',
      bg: '#fff7ed',
    },
    {
      icon: <HeartPulse size={20} />,
      title: 'Pola Asuh Responsive',
      body: 'Jangan pernah memaksa anak makan. Biarkan anak menentukan porsinya sendiri. Terapkan jadwal makan teratur (3x makan utama + 2x snack) dan ciptakan suasana makan yang menyenangkan.',
      tip: 'Tip: Makan bersama keluarga meningkatkan nafsu makan anak hingga 40% dibanding makan sendirian.',
      color: '#db2777',
      bg: '#fdf2f8',
    },
    {
      icon: <Droplets size={20} />,
      title: 'ASI & Hidrasi',
      body: 'ASI eksklusif 6 bulan pertama adalah fondasi kekebalan tubuh. Setelah 6 bulan, lanjutkan ASI + MP-ASI hingga usia 2 tahun. Pastikan si kecil minum air putih yang cukup setiap hari.',
      tip: 'Tip: Bayi 6-12 bulan butuh 200ml air putih/hari di luar ASI. Usia 1-3 tahun butuh 600-900ml.',
      color: '#0284c7',
      bg: '#f0f9ff',
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Imunisasi Lengkap',
      body: 'Imunisasi melindungi anak dari penyakit serius yang bisa mengganggu pertumbuhan. Pastikan jadwal imunisasi dasar lengkap (BCG, Polio, DPT-HB-Hib, Campak, MR) sesuai usia.',
      tip: 'Tip: Anak yang sakit berulang cenderung mengalami penurunan berat badan → risiko stunting meningkat.',
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      icon: <Baby size={20} />,
      title: 'Sanitasi & Kebersihan',
      body: 'Diare akibat sanitasi buruk adalah penyebab tersembunyi stunting. Cuci tangan pakai sabun sebelum menyiapkan makanan, sebelum menyuapi anak, dan setelah dari toilet.',
      tip: 'Tip: Investasi jamban sehat & air bersih mengurangi risiko stunting hingga 27% menurut WHO.',
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      icon: <Sparkles size={20} />,
      title: 'Stimulasi & Tidur Cukup',
      body: 'Ajak anak bermain aktif minimal 1 jam/hari. Dorong eksplorasi, bernyanyi, dan bercerita. Pastikan tidur cukup: 11-14 jam untuk usia 1-2 tahun, 10-13 jam untuk usia 3-5 tahun.',
      tip: 'Tip: Hormon pertumbuhan paling aktif diproduksi saat anak tidur nyenyak di malam hari.',
      color: '#ca8a04',
      bg: '#fefce8',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col page-enter" style={{ background: 'var(--gw-grad-subtle)' }}>
      {/* ═══ NAVBAR ═══ */}
      <nav className="sticky top-0 z-40 border-b border-white/40" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={growellLogo} alt="Growell" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-gray-900 tracking-tight">Growell</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full text-teal-700" style={{ background: 'rgba(13,148,136,0.08)' }}>Orang Tua</span>
          </Link>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition p-2 rounded-xl hover:bg-red-50" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Halo, {userData.nama} 👋</h1>
          <p className="text-gray-500 mt-1.5 text-sm sm:text-base">Selamat datang di portal orang tua Growell. Yuk, pantau tumbuh kembang si kecil!</p>
        </div>

        {/* ═══ ACTION CARDS ═══ */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          <Link to="/orang-tua/kuesioner" className="group gw-card p-6 sm:p-7 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-50 group-hover:opacity-80 transition" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.12), transparent)' }}></div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 relative z-10 group-hover:scale-110 transition-transform" style={{ background: 'rgba(13,148,136,0.08)' }}>
              <ClipboardList className="text-teal-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5 relative z-10">Isi Form & Update Data Anak</h3>
            <p className="text-sm text-gray-500 leading-relaxed relative z-10">Catat riwayat kesehatan, nutrisi, dan lingkungan anak. Data digabungkan dengan pengukuran kader untuk prediksi gizi AI.</p>
            <div className="mt-5 flex items-center text-sm font-semibold text-teal-600 group-hover:text-teal-700 transition relative z-10">
              Isi Kuesioner <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link to="/konsultasi" className="group gw-card p-6 sm:p-7 relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full opacity-50 group-hover:opacity-80 transition" style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.12), transparent)' }}></div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 relative z-10 group-hover:scale-110 transition-transform" style={{ background: 'rgba(5,150,105,0.08)' }}>
              <MessageCircle className="text-emerald-600" size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1.5 relative z-10">Konsultasi Ahli Gizi</h3>
            <p className="text-sm text-gray-500 leading-relaxed relative z-10">Tanyakan masalah asupan makan, perkembangan balita, atau keluhan lainnya langsung ke Ahli Gizi via chat.</p>
            <div className="mt-5 flex items-center text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 transition relative z-10">
              Mulai Konsultasi <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* ═══ EDUKASI SECTION ═══ */}
        <div className="mt-12 sm:mt-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.08)' }}>
              <BookOpen className="text-teal-600" size={18} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">Edukasi Tumbuh Kembang</h2>
              <p className="text-xs sm:text-sm text-gray-500">Panduan praktis untuk orang tua — dari pola makan hingga stimulasi anak.</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {eduCards.map((card, i) => (
              <div key={i} className="gw-card !rounded-2xl p-5 group cursor-default" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 transition group-hover:scale-110" style={{ background: card.bg, color: card.color }}>{card.icon}</div>
                <h4 className="font-bold text-gray-900 text-[15px] mb-2">{card.title}</h4>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{card.body}</p>
                <div className="text-[11px] font-medium leading-relaxed px-3 py-2 rounded-lg" style={{ background: card.bg, color: card.color }}>💡 {card.tip}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
