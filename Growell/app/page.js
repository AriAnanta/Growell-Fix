'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronRight, ArrowRight, Brain, Activity, MessageSquare, FileBarChart, User, LogOut, ChevronDown, CheckCircle2, HeartPulse, Stethoscope, Baby, Star, Users, Utensils, Building, Sparkles } from 'lucide-react';
import { isAuthenticated, getUserData, clearAuth } from '@/utils/auth';

export default function GrowellLanding() {
  const router = useRouter();
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
    const timer = setTimeout(() => setIsLoading(false), 1200);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    const observerOptions = { threshold: 0.15, rootMargin: '0px 0px -100px 0px' };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.getAttribute('data-section-id');
        if (!sectionId) return;
        setVisibleSections((prev) => {
          const newSet = new Set(prev);
          if (entry.isIntersecting) newSet.add(sectionId);
          else newSet.delete(sectionId);
          return newSet;
        });
      });
    }, observerOptions);
    const timeoutId = setTimeout(() => {
      Object.values(sectionRefs.current).forEach((ref) => { if (ref) observer.observe(ref); });
    }, 100);
    return () => { clearTimeout(timeoutId); observer.disconnect(); };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target))
        setProfileDropdownOpen(false);
    }
    if (profileDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const handleLogout = async () => {
    await clearAuth();
    setIsLoggedIn(false);
    setUserData(null);
    setProfileDropdownOpen(false);
    router.push('/');
  };

  const getDashboardPath = () => {
    if (!userData) return '/kader';
    if (userData.role === 'orang_tua') return '/orang-tua';
    if (userData.role === 'ahli_gizi') return '/konsultasi';
    return '/kader';
  };

  return (
    <>
      {/* ── Loading Screen ── */}
      <div className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-all duration-700 ease-in-out ${isLoading ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-xl animate-bounce-soft">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-400/20 to-blue-500/20 animate-ping" />
          </div>
          <span className="text-slate-800 font-extrabold text-2xl tracking-tight mt-2">Growell</span>
          <div className="flex gap-2.5 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white overflow-x-hidden font-sans text-slate-800">

        {/* ── Navigation ── */}
        <nav className={`fixed z-50 transition-all duration-700 ease-in-out left-1/2 -translate-x-1/2 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}
          ${isScrolled
            ? 'top-4 w-[calc(100%-2rem)] max-w-6xl rounded-[2rem] bg-white/95 shadow-xl shadow-teal-900/10 border border-teal-100 backdrop-blur-md py-0'
            : 'top-0 w-full max-w-[100vw] rounded-none bg-transparent border-b border-transparent py-2'
          }`}
        >
          <div className="mx-auto px-5 sm:px-8 lg:px-10">
            <div className={`flex justify-between items-center transition-all duration-700 ease-in-out ${isScrolled ? 'h-16' : 'h-24'}`}>

              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className={`rounded-2xl overflow-hidden shadow-sm group-hover:scale-105 transition-all duration-700 ease-in-out ${isScrolled ? 'w-9 h-9' : 'w-12 h-12'}`}>
                  <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
                </div>
                <span className={`font-extrabold tracking-tight transition-all duration-700 ease-in-out text-slate-800 ${isScrolled ? 'text-xl' : 'text-2xl'}`}>
                  Growell
                </span>
              </Link>

              {/* Desktop Links */}
              <div className="hidden lg:flex items-center gap-8 bg-slate-50/50 px-6 py-2.5 rounded-full border border-slate-100">
                {[['#hero', 'Home'], ['#features', 'Fitur'], ['#how', 'Cara Kerja'], ['#roles', 'Untuk Siapa'], ['#testimoni', 'Kisah'], ['#faq', 'Tanya Jawab']].map(([href, label]) => (
                  <a key={href} href={href} className={`text-sm font-bold transition-colors text-slate-600 hover:text-teal-500`}>
                    {label}
                  </a>
                ))}
              </div>

              {/* CTA */}
              <div className="hidden lg:flex items-center gap-4">
                {isLoggedIn ? (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-400 to-indigo-500 text-white rounded-full text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {(userData?.nama || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span>{userData?.nama?.split(' ')[0] || 'Profil'}</span>
                      <ChevronDown size={16} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl shadow-teal-900/10 border border-teal-50 overflow-hidden z-50 animate-fade-in-down">
                        <div className="p-2">
                          <button onClick={() => { setProfileDropdownOpen(false); router.push(getDashboardPath()); }}
                            className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-600 rounded-2xl flex items-center gap-3 font-bold transition-colors">
                            <Activity size={18} /> Dasbor Saya
                          </button>
                          <button onClick={() => { setProfileDropdownOpen(false); router.push('/profile'); }}
                            className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-600 rounded-2xl flex items-center gap-3 font-bold transition-colors">
                            <User size={18} /> Profil Saya
                          </button>
                          <div className="h-px bg-slate-100 my-1 mx-2" />
                          <button onClick={handleLogout}
                            className="w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 rounded-2xl flex items-center gap-3 font-bold transition-colors">
                            <LogOut size={18} /> Keluar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link href="/login" className={`text-sm font-bold transition-colors text-slate-600 hover:text-teal-500`}>
                      Masuk
                    </Link>
                    <Link href="/register" className="px-6 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 text-white text-sm font-bold rounded-full shadow-md hover:shadow-xl hover:shadow-teal-400/30 hover:-translate-y-0.5 transition-all duration-300">
                      Mulai Sekarang
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Burger */}
              <button className={`lg:hidden p-2.5 rounded-2xl transition-colors bg-slate-50 text-slate-700 hover:bg-slate-100`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-full left-0 right-0 mt-2 mx-4 bg-white rounded-3xl shadow-2xl shadow-teal-900/10 border border-teal-50 animate-slide-down overflow-hidden">
              <div className="p-4 flex flex-col gap-1">
                {[['#hero', 'Home'], ['#features', 'Fitur'], ['#how', 'Cara Kerja'], ['#roles', 'Untuk Siapa'], ['#testimoni', 'Kisah'], ['#faq', 'Tanya Jawab']].map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3.5 text-slate-600 font-bold rounded-2xl hover:bg-teal-50 hover:text-teal-600 transition-colors">
                    {label}
                  </a>
                ))}
                <div className="h-px bg-slate-100 my-2 mx-2" />
                <div className="flex flex-col gap-2 pt-1">
                  {isLoggedIn ? (
                    <>
                      <Link href={getDashboardPath()} className="px-5 py-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-2xl font-bold text-center">
                        Buka Dasbor
                      </Link>
                      <button onClick={handleLogout} className="px-5 py-3.5 bg-rose-50 text-rose-600 rounded-2xl font-bold text-center">
                        Keluar
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="px-5 py-3.5 bg-slate-50 text-slate-700 rounded-2xl font-bold text-center">
                        Masuk Akun
                      </Link>
                      <Link href="/register" className="px-5 py-3.5 bg-gradient-to-r from-teal-500 to-indigo-600 text-white rounded-2xl font-bold text-center">
                        Daftar Gratis
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ── HERO ── */}
        <section
          id="hero"
          className={`relative min-h-[90vh] flex items-center pt-28 pb-20 overflow-hidden transition-all duration-1000 ${!isLoading ? 'opacity-100' : 'opacity-0'}`}>

          {/* Decorative Background Elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Top right blob */}
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-100/60 to-indigo-100/60 blur-3xl animate-float-slow" />
            {/* Mid left blob */}
            <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-100/50 to-amber-100/40 blur-3xl animate-float" />
            {/* Playful dots pattern smoothly fading out */}
            <div className="absolute inset-0 opacity-[0.3]" style={{
              backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              maskImage: 'linear-gradient(to bottom, black 20%, transparent 60%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 60%)'
            }} />
          </div>

          <div className="relative z-10 w-full mt-4 lg:mt-10">
            <div className="flex flex-col items-center justify-center text-center">

              {/* Text Content Container (Constrained Width) */}
              <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full relative z-10">
                {/* Badge */}
                <div className={`inline-flex items-center gap-2 sm:gap-2.5 mb-6 px-3 py-1.5 sm:px-5 sm:py-2 rounded-full border border-teal-100 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-700 delay-300 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <span className="flex h-2.5 w-2.5 sm:h-3 sm:w-3 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-teal-500"></span>
                  </span>
                  <span className="text-slate-600 text-xs sm:text-sm font-bold tracking-wide">Sistem Gizi Balita Berbasis AI &mdash; Indonesia</span>
                </div>

                {/* Headline */}
                <h1 className={`text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold text-slate-800 leading-[1.15] mb-6 max-w-4xl mx-auto transition-all duration-700 delay-500 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                  Deteksi Dini <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-indigo-600">Stunting</span> <br className="hidden md:block" />
                  dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">Kecerdasan AI</span>
                </h1>

                {/* Subtitle */}
                <p className={`text-slate-500 text-lg lg:text-xl leading-relaxed mb-8 max-w-2xl mx-auto font-medium transition-all duration-700 delay-700 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  Platform digital Posyandu untuk prediksi status gizi balita, konsultasi ahli gizi, dan pelaporan data kelurahan secara real-time.
                </p>

                {/* CTAs */}
                <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-1000 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <Link href="/register"
                    className="group relative px-8 py-4 bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-extrabold text-base rounded-full shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-1 transition-all duration-300">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Mulai Gratis Sekarang
                      <ArrowRight size={22} className="group-hover:translate-x-1 group-hover:rotate-0 text-white transition-transform duration-300" />
                    </span>
                  </Link>
                  <a href="#how"
                    className="group px-8 py-4 bg-white/80 backdrop-blur-sm border-2 border-slate-100 text-slate-700 font-extrabold text-base rounded-full hover:border-teal-200 hover:bg-teal-50 hover:text-teal-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-sm">
                    Lihat Cara Kerjanya
                    <ChevronRight size={20} className="group-hover:translate-x-1 text-teal-500 transition-transform duration-300" />
                  </a>
                </div>

                {/* Trust badge */}
                <div className={`mt-8 mb-8 flex flex-wrap gap-8 justify-center transition-all duration-700 delay-[1200ms] ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  {[
                    { val: '3 Model', sub: 'AI Prediksi Gizi' },
                    { val: '83+', sub: 'Variabel Analisis' },
                    { val: '100%', sub: 'Data Terenkripsi' },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{s.val}</div>
                      <div className="text-slate-500 text-sm font-bold mt-1">{s.sub}</div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Hero Image Area */}
              <div className={`w-full overflow-x-hidden -mt-24 sm:-mt-48 lg:-mt-64 xl:-mt-80 relative z-0 fade-image-bottom transition-all duration-1000 delay-700 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                <div className="flex justify-center w-full relative">
                  <img src="/heroImage3.png" alt="Growell Hero" className="w-[140%] max-w-none sm:w-[125%] md:w-[120%] lg:w-[110%] xl:w-[110%] xl:max-w-none mx-auto h-auto object-contain object-center opacity-90 sm:-translate-x-20 max-sm:-ml-[6%] mt-20 sm:mt-0" style={{ maskImage: 'linear-gradient(to top, transparent 5%, black 40%)', WebkitMaskImage: 'linear-gradient(to top, transparent 5%, black 40%)' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          data-section-id="features"
          ref={(el) => (sectionRefs.current['features'] = el)}
          className="py-10 sm:py-16 bg-white relative z-10"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-10 lg:mb-12 transition-all duration-700 ${visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-5 py-2 bg-teal-50 text-teal-600 font-bold rounded-full tracking-wide uppercase text-sm mb-4 border border-teal-100">
                Fitur Unggulan
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                Lebih dari Sekedar <br className="hidden sm:block" /> Catatan Posyandu
              </h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
                Kami menghadirkan teknologi ramah untuk mempermudah pemantauan gizi anak kesayangan Anda.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {[
                {
                  icon: <Brain size={28} />,
                  color: 'teal',
                  title: 'Prediksi Gizi AI',
                  desc: 'Model machine learning memprediksi status gizi (BB/U, TB/U, BB/TB) dengan akurasi tinggi berdasarkan 83+ variabel.',
                },
                {
                  icon: <Activity size={28} />,
                  color: 'indigo',
                  title: 'Monitoring Pertumbuhan',
                  desc: 'Pantau berat, tinggi, dan lingkar kepala balita secara berkala dengan grafik pertumbuhan mengacu standar WHO.',
                },
                {
                  icon: <MessageSquare size={28} />,
                  color: 'amber',
                  title: 'Konsultasi Online',
                  desc: 'Orang tua dapat berkonsultasi langsung dengan ahli gizi terverifikasi kapan saja dan di mana saja.',
                },
                {
                  icon: <FileBarChart size={28} />,
                  color: 'rose',
                  title: 'Laporan Otomatis',
                  desc: 'Kelurahan dan Puskesmas mendapat laporan data gizi bulanan secara otomatis dalam format siap cetak.',
                },
              ].map((f, idx) => {
                const colorMap = {
                  teal: { bg: 'bg-teal-50', icon: 'text-teal-500', border: 'hover:border-teal-200', hoverBg: 'hover:bg-teal-50/50' },
                  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', border: 'hover:border-indigo-200', hoverBg: 'hover:bg-indigo-50/50' },
                  amber: { bg: 'bg-amber-50', icon: 'text-amber-500', border: 'hover:border-amber-200', hoverBg: 'hover:bg-amber-50/50' },
                  rose: { bg: 'bg-rose-50', icon: 'text-rose-500', border: 'hover:border-rose-200', hoverBg: 'hover:bg-rose-50/50' },
                };
                const c = colorMap[f.color];
                return (
                  <div
                    key={idx}
                    className={`group p-8 rounded-[2.5rem] bg-white border-2 border-slate-50 hover:shadow-xl hover:shadow-slate-200/50 ${c.border} ${c.hoverBg} transition-all duration-500 cursor-default
                      ${visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: visibleSections.has('features') ? `${idx * 100}ms` : '0ms' }}
                  >
                    <div className={`inline-flex items-center justify-center w-16 h-16 ${c.bg} ${c.icon} rounded-2xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
                      {f.icon}
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-3">{f.title}</h3>
                    <p className="text-slate-500 text-base leading-relaxed font-medium">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how"
          data-section-id="how"
          ref={(el) => (sectionRefs.current['how'] = el)}
          className="py-10 sm:py-16 bg-slate-50 rounded-[3rem] lg:rounded-[5rem] mx-2 sm:mx-6 lg:mx-8 my-0 relative overflow-hidden shadow-inner"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/40 rounded-full blur-3xl mix-blend-multiply" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl mix-blend-multiply" />

          {/* Baby Illustration */}
          <div className={`hidden sm:block absolute bottom-0 left-0 sm:left-4 lg:left-10 w-32 sm:w-48 lg:w-64 z-0 pointer-events-none transition-all duration-1000 delay-300 ${visibleSections.has('how') ? 'translate-x-0 translate-y-0 opacity-90' : '-translate-x-8 translate-y-8 opacity-0'}`}>
            <img src="/baby.png" alt="Baby Illustration" className="w-full h-auto object-contain drop-shadow-xl" />
          </div>

          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
            <div className={`text-center mb-16 lg:mb-24 transition-all duration-700 ${visibleSections.has('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-6">
                Tiga Langkah Mudah
              </h2>
              <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
                Dirancang untuk kader posyandu yang aktif &mdash; tanpa perlu keahlian teknis.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-10 lg:gap-16 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-[3.5rem] left-[calc(16.66%+3rem)] right-[calc(16.66%+3rem)] border-t-[3px] border-dashed border-teal-200" />

              {[
                { num: '01', title: 'Daftar & Verifikasi', desc: 'Kader, orang tua, atau tenaga kesehatan mendaftar akun sesuai peran masing-masing.', color: 'bg-teal-100 text-teal-600', dropShadow: 'shadow-teal-100' },
                { num: '02', title: 'Input Data Balita', desc: 'Masukkan data pengukuran antropometri dan faktor risiko.', color: 'bg-indigo-100 text-indigo-600', dropShadow: 'shadow-indigo-100' },
                { num: '03', title: 'Terima Rekomendasi', desc: 'AI Growell menganalisis data dan memberikan prediksi gizi serta rekomendasi intervensi.', color: 'bg-amber-100 text-amber-600', dropShadow: 'shadow-amber-100' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col items-center text-center transition-all duration-700 ${visibleSections.has('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('how') ? `${idx * 150}ms` : '0ms' }}
                >
                  <div className={`relative z-10 w-20 h-20 sm:w-28 sm:h-28 rounded-full ${step.color} border-8 border-white shadow-xl ${step.dropShadow} text-3xl sm:text-4xl font-black flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300`}>
                    {step.num}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 mb-4">{step.title}</h3>
                  <p className="text-slate-500 text-base font-medium leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ROLES SECTION ── */}
        <section
          id="roles"
          data-section-id="roles"
          ref={(el) => (sectionRefs.current['roles'] = el)}
          className="py-10 sm:py-16 bg-white"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 transition-all duration-700 ${visibleSections.has('roles') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-5 py-2 bg-rose-50 text-rose-600 font-bold rounded-full tracking-wide uppercase text-sm mb-6 border border-rose-100">
                UNTUK SIAPA
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-6">
                Dibangun untuk Semua<br className="hidden sm:block" /> Pemangku Kepentingan
              </h2>
              <p className="text-slate-500 font-medium text-lg max-w-xl mx-auto">
                Growell menghubungkan seluruh ekosistem kesehatan balita dalam satu platform terpadu.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { role: 'Kader Posyandu', desc: 'Input pengukuran dan dapatkan prediksi gizi instan dengan AI.', icon: <Stethoscope size={48} strokeWidth={1.5} />, bg: 'bg-teal-50', hover: 'bg-teal-500', text: 'text-teal-700' },
                { role: 'Orang Tua', desc: 'Pantau tumbuh kembang si kecil dan konsultasi dengan ahli gizi.', icon: <Users size={48} strokeWidth={1.5} />, bg: 'bg-indigo-50', hover: 'bg-indigo-500', text: 'text-indigo-700' },
                { role: 'Ahli Gizi', desc: 'Terima konsultasi online dan pantau balita berisiko secara terpusat.', icon: <Utensils size={48} strokeWidth={1.5} />, bg: 'bg-amber-50', hover: 'bg-amber-500', text: 'text-amber-700' },
                { role: 'Kelurahan / Puskesmas', desc: 'Akses dashboard data dan laporan gizi wilayah secara real-time.', icon: <Building size={48} strokeWidth={1.5} />, bg: 'bg-rose-50', hover: 'bg-rose-500', text: 'text-rose-700' },
              ].map((r, idx) => (
                <div
                  key={idx}
                  className={`group relative overflow-hidden rounded-[2.5rem] p-8 transition-all duration-500 bg-white border-2 border-slate-50 hover:border-transparent hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-300/30 ${visibleSections.has('roles') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('roles') ? `${idx * 100}ms` : '0ms' }}
                >
                  <div className={`absolute inset-0 ${r.bg} opacity-20 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`absolute inset-0 ${r.hover} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10 flex flex-col items-center text-center pt-4">
                    <span className={`mb-6 block group-hover:scale-125 group-hover:-translate-y-2 transition-transform duration-500 ${r.text} group-hover:text-white`}>
                      {r.icon}
                    </span>
                    <h3 className={`font-extrabold text-xl mb-3 ${r.text} group-hover:text-white transition-colors duration-300`}>{r.role}</h3>
                    <p className={`text-slate-500 font-medium group-hover:text-white/90 transition-colors duration-300`}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONI ── */}
        <section
          id="testimoni"
          data-section-id="testimoni"
          ref={(el) => (sectionRefs.current['testimoni'] = el)}
          className="py-10 sm:py-16 bg-slate-50 relative overflow-hidden"
        >
          {/* Decorative shapes */}
          <div className="absolute top-0 left-[-10%] w-64 h-64 bg-teal-100/40 rounded-full blur-3xl mix-blend-multiply" />
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-amber-100/40 rounded-full blur-3xl mix-blend-multiply" />

          {/* Baby Illustration 2 */}
          <div className={`hidden sm:block absolute bottom-0 right-0 sm:right-4 lg:right-10 w-32 sm:w-48 lg:w-64 z-0 pointer-events-none transition-all duration-1000 delay-300 ${visibleSections.has('testimoni') ? 'translate-x-0 translate-y-0 opacity-90' : 'translate-x-8 translate-y-8 opacity-0'}`}>
            <img src="/baby2.png" alt="Baby Illustration" className="w-full h-auto object-contain drop-shadow-xl" />
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 relative z-10">
            <div className={`text-center mb-16 transition-all duration-700 ${visibleSections.has('testimoni') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5 border border-indigo-100">
                TESTIMONI
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-6">
                Dipercaya Posyandu<br className="hidden sm:block" /> di Seluruh Kota Bandung
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Bu Siti Aminah', role: 'Kader Posyandu Mawar, Karanganyar', quote: 'Sebelumnya kami catat manual di buku. Sekarang pakai Growell langsung dapat prediksi status gizi balita — lebih cepat dan akurat. Kerjaan kader jadi jauh lebih mudah.', color: 'bg-teal-400' },
                { name: 'Ibu Dewi Lestari', role: 'Orang Tua Balita, Panjunan', quote: 'Anak saya sempat turun berat badannya. Lewat Growell, saya dapat rekomendasi makanan dan bisa konsultasi ahli gizi online tanpa harus ke puskesmas dulu.', color: 'bg-indigo-400' },
                { name: 'Dr. Ratna Sari', role: 'Ahli Gizi, Puskesmas Sukamaju', quote: 'Data yang masuk ke dashboard sangat ter-visualisasi dengan baik. Saya bisa melihat tren balita berisiko di wilayah dan intervensi lebih cepat dari sebelumnya.', color: 'bg-amber-400' },
              ].map((t, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-[2.5rem] p-8 shadow-sm border-2 border-slate-50 hover:shadow-xl transition-all duration-700 flex flex-col ${visibleSections.has('testimoni') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('testimoni') ? `${idx * 150}ms` : '0ms' }}
                >
                  <div className="flex gap-1 mb-6 text-amber-400">
                    {[1, 2, 3, 4, 5].map(star => <Star key={star} size={16} fill="currentColor" />)}
                  </div>
                  <p className="text-slate-500 font-medium italic mb-8 flex-grow leading-relaxed">"{t.quote}"</p>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className={`w-12 h-12 rounded-full ${t.color} flex items-center justify-center text-white font-black text-xl shadow-md`}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800">{t.name}</h4>
                      <p className="text-sm font-medium text-slate-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          id="faq"
          data-section-id="faq"
          ref={(el) => (sectionRefs.current['faq'] = el)}
          className="py-10 sm:py-16 bg-white"
        >
          <div className="max-w-4xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 transition-all duration-700 ${visibleSections.has('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5 border border-amber-100">
                PERTANYAAN UMUM
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-800 tracking-tight mb-6">
                Ada yang Ingin Ditanyakan?
              </h2>
              <p className="text-slate-500 text-lg font-medium">Jawaban untuk pertanyaan yang paling sering kami terima.</p>
            </div>

            <div className="space-y-4">
              {[
                { q: 'Siapa saja yang bisa menggunakan Growell?', a: 'Growell dirancang untuk kader posyandu, orang tua balita, ahli gizi, serta tenaga administrasi kelurahan dan puskesmas. Setiap peran memiliki akses fitur yang disesuaikan.' },
                { q: 'Bagaimana cara kerja prediksi status gizi AI?', a: 'Growell menggunakan 3 model machine learning (BB/U, TB/U, BB/TB) yang dilatih dari data antropometri balita riil. Kader cukup memasukkan pengukuran, dan sistem secara instan memprediksikan status gizi beserta rekomendasi intervensi.' },
                { q: 'Apakah data balita saya aman?', a: 'Semua data tersimpan dengan enkripsi dan hanya dapat diakses oleh pihak yang berwenang sesuai peran. Kami mematuhi standar keamanan data kesehatan yang berlaku di Indonesia.' },
                { q: 'Apakah Growell gratis untuk posyandu?', a: 'Saat ini Growell dalam tahap deployment dan dapat digunakan secara gratis. Kami berkomitmen untuk mendukung program gizi nasional tanpa biaya bagi posyandu.' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-3xl p-6 md:p-8 border-2 border-slate-50 shadow-sm hover:shadow-md transition-all duration-700 ${visibleSections.has('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('faq') ? `${idx * 100}ms` : '0ms' }}
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    <div className="bg-teal-50 p-3 rounded-2xl shrink-0 mt-1">
                      <CheckCircle2 className="text-teal-500" size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-3">{item.q}</h3>
                      <p className="text-slate-500 leading-relaxed font-medium">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          data-section-id="cta"
          ref={(el) => (sectionRefs.current['cta'] = el)}
          className="relative py-10 sm:py-16 px-5 sm:px-6 lg:px-8 bg-white overflow-hidden"
        >
          {/* Sparkles / Stars Outside */}
          <div className={`hidden md:block absolute top-[10%] left-[8%] text-amber-400 transition-all duration-1000 delay-300 ${visibleSections.has('cta') ? 'opacity-80 scale-100 translate-y-0' : 'opacity-0 scale-0 translate-y-10'}`}>
            <Sparkles size={48} strokeWidth={1.5} className="animate-wiggle-soft" />
          </div>
          <div className={`hidden md:block absolute bottom-[15%] right-[8%] text-teal-400 transition-all duration-1000 delay-500 ${visibleSections.has('cta') ? 'opacity-80 scale-100 translate-y-0' : 'opacity-0 scale-0 translate-y-10'}`}>
            <Sparkles size={56} strokeWidth={1.5} className="animate-wiggle-soft" style={{ animationDelay: '300ms' }} />
          </div>
          <div className={`hidden lg:block absolute top-[20%] right-[15%] text-indigo-400 transition-all duration-1000 delay-700 ${visibleSections.has('cta') ? 'opacity-60 scale-100 translate-y-0' : 'opacity-0 scale-0 translate-y-10'}`}>
            <Sparkles size={32} strokeWidth={1.5} className="animate-wiggle-soft" style={{ animationDelay: '600ms' }} />
          </div>
          <div className={`hidden lg:block absolute bottom-[20%] left-[15%] text-rose-400 transition-all duration-1000 delay-1000 ${visibleSections.has('cta') ? 'opacity-60 scale-100 translate-y-0' : 'opacity-0 scale-0 translate-y-10'}`}>
            <Sparkles size={40} strokeWidth={1.5} className="animate-wiggle-soft" style={{ animationDelay: '900ms' }} />
          </div>

          <div className={`relative z-10 max-w-5xl mx-auto text-center bg-gradient-to-br from-teal-500 to-indigo-600 rounded-[3rem] sm:rounded-[4rem] p-12 sm:p-20 shadow-2xl shadow-indigo-500/20 overflow-hidden transition-all duration-1000 ${visibleSections.has('cta') ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>

            {/* Colorful blobs inside CTA */}
            <div className="absolute -top-24 -left-20 w-64 h-64 bg-teal-400 rounded-full blur-3xl opacity-60 mix-blend-screen" />
            <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-indigo-400 rounded-full blur-3xl opacity-60 mix-blend-screen" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl lg:text-5xl font-black text-white tracking-tight mb-6">
                Ayo Bersama <br className="hidden sm:block" /> Cegah Stunting Anak!
              </h2>
              <p className="text-teal-50 text-lg sm:text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-medium">
                Daftarkan posyandu tau anak Anda sekarang dan rasakan kemudahan memantau kesehatan si kecil.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center mt-8">
                <Link href="/register"
                  className="group px-10 py-5 bg-white text-indigo-600 font-extrabold text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                  Daftar Sekarang
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/login"
                  className="px-10 py-5 bg-indigo-500/30 border-2 border-white/30 text-white font-extrabold text-lg rounded-full hover:bg-white/20 hover:border-white/50 transition-all duration-300">
                  Sudah Punya Akun?
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-slate-50 pt-20 pb-10 mt-10">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-sm">
                    <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xl font-extrabold text-slate-800">Growell</span>
                </div>
                <p className="text-slate-500 font-medium text-sm leading-relaxed pr-4">
                  Menemani tumbuh kembang anak Indonesia dengan teknologi ramah dan cerdas. Sehat anaknya, tenang bundanya!
                </p>
              </div>
              {[
                { title: 'Tentang', links: ['Beranda', 'Fitur', 'Kisah'] },
                { title: 'Pengguna', links: ['Orang Tua', 'Kader Posyandu', 'Tenaga Kesehatan'] },
                { title: 'Hubungi', links: ['Pusat Bantuan', 'Tanya Jawab', 'Kebijakan Privasi'] },
              ].map(col => (
                <div key={col.title}>
                  <h4 className="text-base font-extrabold text-slate-800 mb-6">{col.title}</h4>
                  <ul className="space-y-4">
                    {col.links.map(l => (
                      <li key={l}><a href="#" className="font-medium text-slate-500 hover:text-teal-500 transition-colors text-sm">{l}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-400">
              <span>&copy; 2025 Growell Indonesia.</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
