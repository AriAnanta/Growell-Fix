import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, Star, BarChart3, BookOpen, Shield, User, LogOut, ChevronDown, ArrowRight, Heart, Sparkles, Activity } from 'lucide-react';
import growellLogo from '../assets/Growell (1).png';
import { isAuthenticated, getUserData, clearAuth } from '../utils/auth';

export default function GrowellLanding() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const profileDropdownRef = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    if (isAuthenticated()) { setIsLoggedIn(true); setUserData(getUserData()); }
    setTimeout(() => setIsLoading(false), 800);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => { if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setProfileDropdownOpen(false); };
    if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const handleLogout = () => { clearAuth(); setIsLoggedIn(false); setUserData(null); setProfileDropdownOpen(false); navigate('/'); };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-section-id');
        if (!id) return;
        setVisibleSections((prev) => {
          const s = new Set(prev);
          entry.isIntersecting ? s.add(id) : s.delete(id);
          return s;
        });
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -80px 0px' });

    setTimeout(() => {
      Object.values(sectionRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    }, 100);
    return () => observer.disconnect();
  }, []);

  const sectionVisible = (id) => visibleSections.has(id);

  return (
    <>
      {/* ═══ LOADING SCREEN ═══ */}
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-700 ${isLoading ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        style={{ background: 'var(--gw-grad-dark)' }}>
        <div className="flex flex-col items-center">
          <img src={growellLogo} alt="Growell" className="w-20 h-20 rounded-2xl object-cover mb-4" style={{ animation: 'gw-float 2s ease-in-out infinite' }} />
          <h2 className="text-2xl font-bold text-white tracking-tight">Growell</h2>
          <div className="mt-4 w-32 h-1 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full rounded-full" style={{ background: 'var(--gw-grad)', animation: 'gw-shimmer 1.5s linear infinite', backgroundSize: '200% 100%' }}></div>
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white">
        {/* ═══ NAVBAR ═══ */}
        <nav className={`fixed z-50 transition-all duration-500 left-1/2 -translate-x-1/2 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'} ${isScrolled
          ? 'top-4 w-[94%] max-w-6xl rounded-2xl shadow-xl border border-white/50'
          : 'top-0 w-full rounded-none shadow-none border-b border-transparent'}`}
          style={{ background: isScrolled ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px) saturate(180%)' }}>
          <div className={`mx-auto px-5 sm:px-6 lg:px-8 transition-all duration-500 ${isScrolled ? 'max-w-6xl' : 'max-w-5xl'}`}>
            <div className="flex justify-between items-center h-16 sm:h-[70px]">
              <Link to="/" className="flex items-center gap-2.5">
                <img src={growellLogo} alt="Growell" className="w-9 h-9 rounded-xl object-cover" />
                <span className="text-xl font-bold gw-text-gradient">Growell</span>
              </Link>

              <div className="hidden lg:flex items-center gap-8">
                <a href="#features" className="text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors">Layanan</a>
                <a href="#how" className="text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors">Cara Kerja</a>
                <a href="#testimonials" className="text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors">Testimoni</a>
                <a href="#faq" className="text-sm font-medium text-gray-500 hover:text-teal-600 transition-colors">FAQ</a>
                {isLoggedIn ? (
                  <div className="relative" ref={profileDropdownRef}>
                    <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg" style={{ background: 'var(--gw-grad)' }}>
                      <User size={16} /><span>{userData?.name || 'Profile'}</span>
                      <ChevronDown className={`transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} size={14} />
                    </button>
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden gw-scale-in">
                        <button onClick={() => { setProfileDropdownOpen(false); navigate('/kader'); }} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"><BarChart3 size={16} className="text-teal-600" /><span className="font-medium">Dashboard</span></button>
                        <button onClick={() => { setProfileDropdownOpen(false); navigate('/profile'); }} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"><User size={16} className="text-teal-600" /><span className="font-medium">Profile</span></button>
                        <div className="border-t border-gray-100"></div>
                        <button onClick={handleLogout} className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600"><LogOut size={16} /><span className="font-medium">Logout</span></button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link to="/register" className="gw-btn-primary !py-2.5 !px-5 !text-sm !rounded-xl flex items-center gap-1.5">
                    Mulai Gratis <ArrowRight size={15} />
                  </Link>
                )}
              </div>

              <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 gw-slide-down">
              <div className="px-5 py-5 space-y-3">
                {['Layanan', 'Cara Kerja', 'Testimoni', 'FAQ'].map((label, i) => (
                  <a key={i} href={`#${['features','how','testimonials','faq'][i]}`} onClick={() => setMobileMenuOpen(false)} className="block text-gray-600 hover:text-teal-600 font-medium py-2 gw-fade-up" style={{ animationDelay: `${i * 80}ms` }}>{label}</a>
                ))}
                {isLoggedIn ? (
                  <Link to="/kader" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center py-3 rounded-xl text-white font-semibold gw-fade-up gw-delay-5" style={{ background: 'var(--gw-grad)' }}>Dashboard</Link>
                ) : (
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block w-full text-center py-3 rounded-xl text-white font-semibold gw-fade-up gw-delay-5" style={{ background: 'var(--gw-grad)' }}>Mulai Gratis</Link>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* ═══ HERO ═══ */}
        <section className={`relative pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-24 lg:pb-32 px-5 sm:px-6 lg:px-8 overflow-hidden transition-all duration-1000 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
          {/* Background Blobs */}
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #0d9488, transparent 70%)' }}></div>
          <div className="absolute bottom-0 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #059669, transparent 70%)' }}></div>

          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-teal-100 bg-teal-50/60">
                  <Sparkles size={14} className="text-teal-600" />
                  <span className="text-xs sm:text-sm font-semibold text-teal-700 tracking-wide">Platform Posyandu Digital #1 Indonesia</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] xl:text-[3.8rem] font-extrabold text-gray-900 mb-6 leading-[1.1] tracking-tight">
                  Cegah Stunting,{' '}
                  <span className="gw-text-gradient">Tumbuhkan</span>{' '}
                  Generasi Sehat
                </h1>

                <p className="text-base sm:text-lg text-gray-500 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Sistem pemantauan gizi balita berbasis AI yang membantu kader Posyandu dan orang tua mendeteksi dini risiko stunting — akurat, cepat, dan mudah digunakan.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link to="/register" className="gw-btn-primary flex items-center justify-center gap-2 text-base">
                    Mulai Sekarang <ArrowRight size={18} />
                  </Link>
                  <a href="#how" className="px-7 py-3.5 border-2 border-gray-200 text-gray-700 rounded-[14px] font-semibold text-base hover:border-teal-300 hover:text-teal-700 transition-all flex items-center justify-center gap-2">
                    Pelajari Lebih Lanjut
                  </a>
                </div>

                <div className="mt-10 sm:mt-14 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0">
                  {[
                    { value: '25K+', label: 'Keluarga Terbantu' },
                    { value: '150+', label: 'Posyandu Aktif' },
                    { value: '4.9', label: 'Rating Pengguna', star: true }
                  ].map((s, i) => (
                    <div key={i} className="text-center lg:text-left">
                      <div className="flex items-center justify-center lg:justify-start gap-1">
                        {s.star && <Star className="text-amber-400 fill-amber-400" size={20} />}
                        <span className="text-2xl sm:text-3xl font-bold text-gray-900">{s.value}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero Visual */}
              <div className="relative mt-6 lg:mt-0">
                <div className="absolute inset-0 rounded-3xl transform rotate-2 opacity-20" style={{ background: 'var(--gw-grad)' }}></div>
                <div className="relative rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl overflow-hidden" style={{ background: 'var(--gw-grad-subtle)' }}>
                  <div className="aspect-[4/3] bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=700&h=525&fit=crop" alt="Happy Family" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {/* Floating badges */}
                  <div className="absolute -top-3 -right-3 bg-white rounded-2xl shadow-xl p-3.5 hidden sm:flex items-center gap-2 gw-float" style={{ animationDelay: '0.5s' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gw-grad)' }}><Activity size={14} className="text-white" /></div>
                    <div><div className="font-bold text-sm text-gray-900">AI Prediksi</div><div className="text-[10px] text-gray-500">Akurasi &gt; 90%</div></div>
                  </div>
                  <div className="absolute -bottom-3 -left-3 bg-white rounded-2xl shadow-xl p-3.5 hidden sm:flex items-center gap-2 gw-float" style={{ animationDelay: '1.5s' }}>
                    <Heart size={18} className="text-rose-500 fill-rose-500" />
                    <div><div className="text-lg font-bold text-gray-900">100%</div><div className="text-[10px] text-gray-500">Aman & Gratis</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section id="features" data-section-id="features" ref={(el) => (sectionRefs.current['features'] = el)}
          className={`py-20 sm:py-24 lg:py-28 transition-all duration-1000 ${sectionVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: 'var(--gw-grad-subtle)' }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-14 sm:mb-20">
              <div className="inline-block mb-4 px-4 py-1.5 bg-teal-100/70 text-teal-700 rounded-full text-xs font-bold tracking-wider uppercase">Fitur Unggulan</div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-gray-900 mb-4 tracking-tight">Semua yang Anda Butuhkan</h2>
              <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">Solusi lengkap untuk pemantauan gizi balita — dari pencatatan hingga rekomendasi cerdas berbasis kecerdasan buatan.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {[
                { icon: <BarChart3 size={26} />, title: 'Grafik Pertumbuhan', desc: 'Pantau berat, tinggi, dan lingkar kepala anak dengan standar WHO secara real-time.', color: '#0d9488' },
                { icon: <Heart size={26} />, title: 'Deteksi Dini Stunting', desc: 'AI memprediksi risiko stunting dari data antropometri & kuesioner orang tua.', color: '#e11d48' },
                { icon: <BookOpen size={26} />, title: 'Edukasi Gizi Cerdas', desc: 'Panduan makan, MP-ASI, dan pola asuh yang disesuaikan usia & kondisi balita.', color: '#7c3aed' },
                { icon: <Shield size={26} />, title: 'Konsultasi Ahli Gizi', desc: 'Chat langsung dengan Ahli Gizi profesional untuk solusi tepat dan personal.', color: '#059669' }
              ].map((f, idx) => (
                <div key={idx}
                  className={`gw-card p-6 sm:p-7 group cursor-default transition-all duration-700 ${sectionVisible('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: sectionVisible('features') ? `${idx * 100}ms` : '0ms' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110" style={{ background: `${f.color}12`, color: f.color }}>{f.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section id="how" data-section-id="how" ref={(el) => (sectionRefs.current['how'] = el)}
          className={`py-20 sm:py-24 lg:py-28 transition-all duration-1000 ${sectionVisible('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-14 sm:mb-20">
              <div className="inline-block mb-4 px-4 py-1.5 bg-blue-100/70 text-blue-700 rounded-full text-xs font-bold tracking-wider uppercase">Cara Kerja</div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-gray-900 mb-4 tracking-tight">3 Langkah Mudah</h2>
              <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">Cukup tiga langkah sederhana untuk mulai memantau tumbuh kembang balita secara akurat.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
              {[
                { num: '01', title: 'Daftarkan Akun', desc: 'Buat akun sebagai Kader Posyandu atau Orang Tua hanya dalam 1 menit.', color: 'from-teal-500 to-teal-600' },
                { num: '02', title: 'Catat Data Pengukuran', desc: 'Input data antropometri & isi kuesioner kesehatan langsung dari perangkat Anda.', color: 'from-blue-500 to-blue-600' },
                { num: '03', title: 'Dapatkan Hasil AI', desc: 'Terima prediksi status gizi dan rekomendasi intervensi dari model machine learning.', color: 'from-emerald-500 to-emerald-600' }
              ].map((step, idx) => (
                <div key={idx}
                  className={`relative text-center transition-all duration-700 ${sectionVisible('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: sectionVisible('how') ? `${idx * 150}ms` : '0ms' }}>
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} text-white text-xl font-bold mb-5 shadow-lg`}>{step.num}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  {idx < 2 && <ChevronRight className="hidden md:block absolute top-6 -right-6 lg:-right-8 text-gray-300" size={28} />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TESTIMONIALS ═══ */}
        <section id="testimonials" data-section-id="testimonials" ref={(el) => (sectionRefs.current['testimonials'] = el)}
          className={`py-20 sm:py-24 lg:py-28 transition-all duration-1000 ${sectionVisible('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: 'var(--gw-grad-subtle)' }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-14 sm:mb-20">
              <div className="inline-block mb-4 px-4 py-1.5 bg-amber-100/70 text-amber-700 rounded-full text-xs font-bold tracking-wider uppercase">Testimoni</div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-gray-900 mb-4 tracking-tight">Dipercaya Ribuan Keluarga</h2>
              <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto">Dengarkan cerita nyata dari para kader dan orang tua yang telah merasakan manfaat Growell.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[
                { name: 'Sarah Aminah', role: 'Ibu dari Zahra (2 tahun)', text: 'Growell membantu saya memantau perkembangan Zahra dengan mudah. Fitur grafik pertumbuhan dan konsultasi ahli gizi sangat membantu! Benar-benar solusi yang saya butuhkan.', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
                { name: 'Budi Santoso', role: 'Kader Posyandu Melati', text: 'Dari sebelumnya harus tulis manual, sekarang semua data langsung digital. Prediksi AI-nya akurat dan rekomendasi intervensinya sangat memudahkan pekerjaan kami.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
                { name: 'Dr. Dewi Lestari', role: 'Ahli Gizi, RS Harapan', text: 'Platform yang luar biasa. Data balita tersinkronisasi dengan rapi, memudahkan saya memberikan konsultasi yang tepat sasaran untuk setiap kasus anak.', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' }
              ].map((t, idx) => (
                <div key={idx}
                  className={`gw-card p-6 sm:p-7 transition-all duration-700 ${sectionVisible('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: sectionVisible('testimonials') ? `${idx * 100}ms` : '0ms' }}>
                  <div className="flex gap-0.5 mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="text-amber-400 fill-amber-400" size={15} />)}</div>
                  <p className="text-sm text-gray-600 mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" loading="lazy" />
                    <div><div className="font-semibold text-sm text-gray-900">{t.name}</div><div className="text-xs text-gray-500">{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section id="faq" data-section-id="faq" ref={(el) => (sectionRefs.current['faq'] = el)}
          className={`py-20 sm:py-24 lg:py-28 transition-all duration-1000 ${sectionVisible('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-block mb-4 px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold tracking-wider uppercase">FAQ</div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Pertanyaan Umum</h2>
            </div>

            <div className="space-y-4">
              {[
                { q: 'Bagaimana cara memulai Growell?', a: 'Cukup daftarkan akun Anda, pilih peran (Kader/Orang Tua), lalu ikuti panduan onboarding. Proses hanya 1 menit dan 100% gratis.' },
                { q: 'Apakah data anak saya aman?', a: 'Ya, kami menggunakan enkripsi end-to-end dan mematuhi standar keamanan data kesehatan. Data anak tidak akan dibagikan ke pihak ketiga.' },
                { q: 'Fitur apa saja yang tersedia?', a: 'Growth Tracking, Prediksi Stunting AI, Kuesioner Orang Tua, Rekomendasi Intervensi, Konsultasi Ahli Gizi, dan Laporan Tumbuh Kembang Bulanan.' },
                { q: 'Apakah Growell gratis?', a: 'Growell sepenuhnya gratis untuk kader Posyandu dan orang tua. Misi kami adalah membantu menurunkan angka stunting di Indonesia.' }
              ].map((faq, idx) => (
                <div key={idx}
                  className={`gw-card !rounded-2xl p-6 transition-all duration-700 ${sectionVisible('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: sectionVisible('faq') ? `${idx * 80}ms` : '0ms' }}>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA ═══ */}
        <section data-section-id="cta" ref={(el) => (sectionRefs.current['cta'] = el)}
          className={`py-20 sm:py-24 lg:py-28 relative overflow-hidden transition-all duration-1000 ${sectionVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ background: 'var(--gw-grad-hero)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)' }}></div>
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight leading-tight">Jadikan Posyandu Lebih Cerdas Mulai Hari Ini</h2>
            <p className="text-base sm:text-lg text-white/80 mb-8 max-w-xl mx-auto leading-relaxed">Bergabung dengan 25.000+ keluarga dan ratusan Posyandu yang telah mempercayakan pemantauan gizi balita pada Growell.</p>
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-teal-700 rounded-2xl font-bold text-base hover:shadow-2xl transition-all transform hover:scale-105">
              Daftar Gratis Sekarang <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="bg-gray-950 text-white py-14 sm:py-16">
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <img src={growellLogo} alt="Growell" className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-lg font-bold">Growell</span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">Platform Posyandu digital untuk membantu cegah stunting dan wujudkan generasi Indonesia yang sehat dan kuat.</p>
              </div>
              {[
                { title: 'Platform', items: ['Fitur Unggulan', 'Prediksi AI', 'Konsultasi', 'Unduh Laporan'] },
                { title: 'Perusahaan', items: ['Tentang Kami', 'Tim Ahli', 'Blog', 'Karir'] },
                { title: 'Dukungan', items: ['Pusat Bantuan', 'Hubungi Kami', 'Kebijakan Privasi', 'Syarat & Ketentuan'] }
              ].map((col, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-sm mb-4">{col.title}</h4>
                  <ul className="space-y-2.5">{col.items.map((item, j) => <li key={j}><a href="#" className="text-sm text-gray-400 hover:text-teal-400 transition-colors">{item}</a></li>)}</ul>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
              &copy; 2025 Growell Indonesia. Dibuat dengan ❤️ untuk keluarga Indonesia.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
