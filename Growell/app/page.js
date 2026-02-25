'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ChevronRight, ArrowRight, Brain, Activity, MessageSquare, FileBarChart, User, LogOut, ChevronDown, CheckCircle2, TrendingUp, Users } from 'lucide-react';
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
    const timer = setTimeout(() => setIsLoading(false), 1500);
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

  const handleLogout = () => {
    clearAuth();
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
      {/* â”€â”€ Loading Screen â”€â”€ */}
      <div className={`fixed inset-0 z-[9999] bg-[#030d1a] flex items-center justify-center transition-all duration-700 ease-in-out ${isLoading ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-2xl animate-logo-pulse">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-400/30 to-sky-600/30 animate-ping" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Growell</span>
          <div className="flex gap-1.5 mt-1">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        </div>
      </div>

      <div className="min-h-screen bg-white overflow-x-hidden">

        {/* â”€â”€ Navigation â”€â”€ */}
        <nav className={`fixed z-50 transition-all duration-500 ease-in-out left-1/2 -translate-x-1/2 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'}
          ${isScrolled
            ? 'top-3 w-[calc(100%-2rem)] max-w-6xl rounded-2xl bg-white/90 shadow-xl shadow-black/5 border border-gray-100 backdrop-blur-xl'
            : 'top-0 w-full rounded-none bg-transparent border-b border-white/10'
          }`}>
          <div className="mx-auto px-5 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 sm:h-[4.5rem]">

              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:shadow-teal-200 transition-shadow duration-300">
                  <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
                </div>
                <span className={`text-lg font-bold tracking-tight transition-colors duration-300 ${isScrolled ? 'text-gray-900' : 'text-white'}`}>
                  Growell
                </span>
              </Link>

              {/* Desktop Links */}
              <div className="hidden lg:flex items-center gap-8">
                {[['#features','Fitur'],['#how','Cara Kerja'],['#testimoni','Testimoni'],['#faq','Bantuan']].map(([href, label]) => (
                  <a key={href} href={href} className={`text-sm font-medium transition-colors hover:text-teal-400 ${isScrolled ? 'text-gray-600' : 'text-white/80'}`}>
                    {label}
                  </a>
                ))}
              </div>

              {/* CTA */}
              <div className="hidden lg:flex items-center gap-3">
                {isLoggedIn ? (
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all"
                    >
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {(userData?.nama || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span>{userData?.nama?.split(' ')[0] || 'Profil'}</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden z-50 animate-fade-in-down">
                        <button onClick={() => { setProfileDropdownOpen(false); router.push(getDashboardPath()); }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-medium">
                          <Activity size={15} className="text-teal-500" /> Dashboard
                        </button>
                        <button onClick={() => { setProfileDropdownOpen(false); router.push('/profile'); }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 font-medium">
                          <User size={15} className="text-teal-500" /> Profil Saya
                        </button>
                        <div className="border-t border-gray-100" />
                        <button onClick={handleLogout}
                          className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium">
                          <LogOut size={15} /> Keluar
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link href="/login" className={`text-sm font-semibold transition-colors ${isScrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'}`}>
                      Masuk
                    </Link>
                    <Link href="/register" className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 hover:-translate-y-0.5 transition-all duration-300">
                      Mulai Gratis
                    </Link>
                  </>
                )}
              </div>

              {/* Mobile Burger */}
              <button className={`lg:hidden p-2 rounded-xl transition-colors ${isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'}`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white/98 backdrop-blur-xl border-t border-gray-100 animate-slide-down">
              <div className="px-5 py-6 space-y-1">
                {[['#features','Fitur'],['#how','Cara Kerja'],['#testimoni','Testimoni'],['#faq','Bantuan']].map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                    {label}
                  </a>
                ))}
                <div className="pt-3 flex flex-col gap-2">
                  {isLoggedIn ? (
                    <>
                      <Link href={getDashboardPath()} className="px-4 py-3 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-center text-sm">
                        Buka Dashboard
                      </Link>
                      <button onClick={handleLogout} className="px-4 py-3 border border-red-200 text-red-600 rounded-xl font-semibold text-center text-sm">
                        Keluar
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-center text-sm">
                        Masuk
                      </Link>
                      <Link href="/register" className="px-4 py-3 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-center text-sm">
                        Daftar Gratis
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            HERO
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section className={`relative min-h-screen flex items-center bg-[#030d1a] overflow-hidden transition-all duration-1000 ${!isLoading ? 'opacity-100' : 'opacity-0'}`}>

          {/* Animated gradient orbs */}
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-teal-500/15 blur-[120px] animate-orb-1" />
            <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full bg-sky-600/20 blur-[120px] animate-orb-2" />
            <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-teal-400/8 blur-[100px] animate-orb-3" />
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-hero-grid opacity-[0.025]" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full pt-28 pb-20 sm:pt-36 sm:pb-24">
            <div className="max-w-4xl mx-auto text-center">

              {/* Badge */}
              <div className={`inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 transition-all duration-700 delay-300 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-teal-300 text-xs sm:text-sm font-medium tracking-wide">Sistem Gizi Balita Berbasis AI &mdash; Indonesia</span>
              </div>

              {/* Headline */}
              <h1 className={`text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-6 transition-all duration-700 delay-500 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                Deteksi Dini{' '}
                <span className="text-gradient-hero">Stunting</span>
                <br className="hidden sm:block" />
                {' '}dengan Kecerdasan AI
              </h1>

              {/* Subtitle */}
              <p className={`text-gray-400 text-lg sm:text-xl lg:text-2xl max-w-2xl mx-auto leading-relaxed mb-10 transition-all duration-700 delay-700 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                Platform digital Posyandu untuk prediksi status gizi balita, konsultasi ahli gizi, dan pelaporan data kelurahan secara real-time.
              </p>

              {/* CTAs */}
              <div className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-700 delay-1000 ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <Link href="/register"
                  className="group relative px-8 py-4 bg-gradient-to-r from-teal-500 to-sky-600 text-white font-bold text-base rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-1 transition-all duration-300">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Mulai Gratis Sekarang
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-sky-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
                <a href="#features"
                  className="group px-8 py-4 border border-white/15 text-white font-semibold text-base rounded-2xl hover:bg-white/8 hover:border-white/30 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-sm">
                  Lihat Cara Kerjanya
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>

              {/* Trust badge */}
              <div className={`mt-14 flex flex-wrap gap-6 sm:gap-12 justify-center transition-all duration-700 delay-[1200ms] ${!isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {[
                  { val: '3 Model', sub: 'AI Prediksi Gizi' },
                  { val: '83+', sub: 'Variabel Analisis' },
                  { val: '100%', sub: 'Data Terenkripsi' },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl sm:text-3xl font-extrabold text-white">{s.val}</div>
                    <div className="text-gray-500 text-xs sm:text-sm mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-slow">
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            FEATURES
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section
          id="features"
          data-section-id="features"
          ref={(el) => (sectionRefs.current['features'] = el)}
          className="py-20 sm:py-28 lg:py-32 bg-white"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5">
                Fitur Platform
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
                Satu Platform,<br className="hidden sm:block" /> Semua Kebutuhan Posyandu
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Dari prediksi AI hingga laporan otomatis &mdash; Growell hadir untuk modernisasi layanan gizi balita di Indonesia.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
              {[
                {
                  icon: <Brain size={24} />,
                  color: 'teal',
                  title: 'Prediksi Gizi AI',
                  desc: 'Model machine learning memprediksi status gizi (BB/U, TB/U, BB/TB) dengan akurasi tinggi berdasarkan 83+ variabel.',
                },
                {
                  icon: <Activity size={24} />,
                  color: 'sky',
                  title: 'Monitoring Pertumbuhan',
                  desc: 'Pantau berat, tinggi, dan lingkar kepala balita secara berkala dengan grafik pertumbuhan mengacu standar WHO.',
                },
                {
                  icon: <MessageSquare size={24} />,
                  color: 'indigo',
                  title: 'Konsultasi Online',
                  desc: 'Orang tua dapat berkonsultasi langsung dengan ahli gizi terverifikasi kapan saja dan di mana saja.',
                },
                {
                  icon: <FileBarChart size={24} />,
                  color: 'emerald',
                  title: 'Laporan Otomatis',
                  desc: 'Kelurahan dan Puskesmas mendapat laporan data gizi bulanan secara otomatis dalam format siap cetak.',
                },
              ].map((f, idx) => {
                const colorMap = {
                  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   border: 'group-hover:border-teal-200',   shadow: 'group-hover:shadow-teal-100/80' },
                  sky:    { bg: 'bg-sky-50',    icon: 'text-sky-600',    border: 'group-hover:border-sky-200',    shadow: 'group-hover:shadow-sky-100/80' },
                  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'group-hover:border-indigo-200', shadow: 'group-hover:shadow-indigo-100/80' },
                  emerald:{ bg: 'bg-emerald-50',icon: 'text-emerald-600',border: 'group-hover:border-emerald-200',shadow: 'group-hover:shadow-emerald-100/80' },
                };
                const c = colorMap[f.color];
                return (
                  <div
                    key={idx}
                    className={`group p-6 sm:p-7 rounded-2xl border border-gray-100 hover:shadow-xl ${c.border} ${c.shadow} transition-all duration-500 cursor-default
                      ${visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    style={{ transitionDelay: visibleSections.has('features') ? `${idx * 80}ms` : '0ms' }}
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 ${c.bg} ${c.icon} rounded-xl mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      {f.icon}
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            HOW IT WORKS
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section
          id="how"
          data-section-id="how"
          ref={(el) => (sectionRefs.current['how'] = el)}
          className="py-20 sm:py-28 lg:py-32 bg-[#f8fffe]"
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-16 lg:mb-20 transition-all duration-700 ${visibleSections.has('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-sky-50 text-sky-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5">
                Cara Kerja
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
                Tiga Langkah Mudah<br className="hidden sm:block" /> Menuju Data Akurat
              </h2>
              <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                Dirancang untuk kader posyandu yang aktif &mdash; tanpa perlu keahlian teknis.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
              {/* Connector line */}
              <div className="hidden md:block absolute top-14 left-[calc(16.66%+2rem)] right-[calc(16.66%+2rem)] h-px bg-gradient-to-r from-teal-200 via-sky-200 to-indigo-200" />

              {[
                { num: '01', title: 'Daftar & Verifikasi', desc: 'Kader, orang tua, atau tenaga kesehatan mendaftar dan memverifikasi akun sesuai peran masing-masing.', color: 'from-teal-500 to-teal-600' },
                { num: '02', title: 'Input Data Balita',  desc: 'Masukkan data pengukuran antropometri dan faktor risiko melalui formulir yang telah terstandar.', color: 'from-sky-500 to-sky-600' },
                { num: '03', title: 'Terima Rekomendasi', desc: 'AI Growell menganalisis data dan memberikan prediksi status gizi beserta rekomendasi intervensi yang tepat.',color: 'from-indigo-500 to-indigo-600' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`relative flex flex-col items-center text-center transition-all duration-700 ${visibleSections.has('how') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('how') ? `${idx * 120}ms` : '0ms' }}
                >
                  <div className={`relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${step.color} text-white text-lg sm:text-xl font-extrabold flex items-center justify-center shadow-lg mb-6`}>
                    {step.num}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            ROLES SECTION
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section
          data-section-id="roles"
          ref={(el) => (sectionRefs.current['roles'] = el)}
          className="py-20 sm:py-28 lg:py-32 bg-white"
        >
          <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 transition-all duration-700 ${visibleSections.has('roles') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5">
                Untuk Siapa
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
                Dibangun untuk Semua<br className="hidden sm:block" /> Pemangku Kepentingan
              </h2>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Growell menghubungkan seluruh ekosistem kesehatan balita dalam satu platform terpadu.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {[
                { role: 'Kader Posyandu', desc: 'Input pengukuran dan dapatkan prediksi gizi instan dengan AI.', emoji: '🩺', bg: 'bg-teal-600' },
                { role: 'Orang Tua', desc: 'Pantau tumbuh kembang si kecil dan konsultasi dengan ahli gizi.', emoji: '👨‍👩‍👧', bg: 'bg-sky-600' },
                { role: 'Ahli Gizi', desc: 'Terima konsultasi online dan pantau balita berisiko secara terpusat.', emoji: '🥗', bg: 'bg-indigo-600' },
                { role: 'Kelurahan / Puskesmas', desc: 'Akses dashboard data dan laporan gizi wilayah secara real-time.', emoji: '🏥', bg: 'bg-emerald-600' },
              ].map((r, idx) => (
                <div
                  key={idx}
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-700 cursor-default hover:-translate-y-1 hover:shadow-xl ${visibleSections.has('roles') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('roles') ? `${idx * 80}ms` : '0ms' }}
                >
                  <div className={`absolute inset-0 ${r.bg} opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300`} />
                  <div className="relative">
                    <span className="text-3xl mb-4 block">{r.emoji}</span>
                    <h3 className="font-bold text-gray-900 mb-2 text-base">{r.role}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{r.desc}</p>
                  </div>
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${r.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            TESTIMONIALS
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section
          id="testimoni"
          data-section-id="testimoni"
          ref={(el) => (sectionRefs.current['testimoni'] = el)}
          className="py-20 sm:py-28 lg:py-32 bg-gray-50"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 transition-all duration-700 ${visibleSections.has('testimoni') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5">
                Testimoni
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
                Dipercaya Posyandu<br className="hidden sm:block" /> di Seluruh Kota Bandung
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {[
                { name: 'Bu Siti Aminah', role: 'Kader Posyandu Mawar, Karanganyar', quote: 'Sebelumnya kami catat manual di buku. Sekarang pakai Growell langsung dapat prediksi status gizi balita — lebih cepat dan akurat. Kerjaan kader jadi jauh lebih mudah.' },
                { name: 'Ibu Dewi Lestari', role: 'Orang Tua Balita, Panjunan', quote: 'Anak saya sempat turun berat badannya. Lewat Growell, saya dapat rekomendasi makanan dan bisa konsultasi ahli gizi online tanpa harus ke puskesmas dulu.' },
                { name: 'Dr. Ratna Sari', role: 'Ahli Gizi, Puskesmas Sukamaju', quote: 'Data yang masuk ke dashboard sangat ter-visualisasi dengan baik. Saya bisa melihat tren balita berisiko di wilayah dan intervensi lebih cepat dari sebelumnya.' },
              ].map((t, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl p-6 sm:p-7 border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-500
                    ${visibleSections.has('testimoni') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('testimoni') ? `${idx * 100}ms` : '0ms' }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_,i) => (
                      <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                      <div className="text-gray-400 text-xs">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            FAQ
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section
          id="faq"
          data-section-id="faq"
          ref={(el) => (sectionRefs.current['faq'] = el)}
          className="py-20 sm:py-28 lg:py-32 bg-white"
        >
          <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className={`text-center mb-14 transition-all duration-700 ${visibleSections.has('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full tracking-wider uppercase mb-5">
                Pertanyaan Umum
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Ada yang Ingin Ditanyakan?
              </h2>
              <p className="text-gray-500">Jawaban untuk pertanyaan yang paling sering kami terima.</p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {[
                { q: 'Siapa saja yang bisa menggunakan Growell?', a: 'Growell dirancang untuk kader posyandu, orang tua balita, ahli gizi, serta tenaga administrasi kelurahan dan puskesmas. Setiap peran memiliki akses fitur yang disesuaikan.' },
                { q: 'Bagaimana cara kerja prediksi status gizi AI?', a: 'Growell menggunakan 3 model machine learning (BB/U, TB/U, BB/TB) yang dilatih dari data antropometri balita riil. Kader cukup memasukkan pengukuran, dan sistem secara instan memprediksikan status gizi beserta rekomendasi intervensi.' },
                { q: 'Apakah data balita saya aman?', a: 'Semua data tersimpan dengan enkripsi dan hanya dapat diakses oleh pihak yang berwenang sesuai peran. Kami mematuhi standar keamanan data kesehatan yang berlaku di Indonesia.' },
                { q: 'Apakah Growell gratis untuk posyandu?', a: 'Saat ini Growell dalam tahap deployment dan dapat digunakan secara gratis. Kami berkomitmen untuk mendukung program gizi nasional tanpa biaya bagi posyandu.' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`group p-5 sm:p-6 rounded-2xl border border-gray-100 hover:border-teal-100 hover:bg-teal-50/30 transition-all duration-500
                    ${visibleSections.has('faq') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: visibleSections.has('faq') ? `${idx * 80}ms` : '0ms' }}
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-teal-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm sm:text-base">{item.q}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            CTA
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section
          data-section-id="cta"
          ref={(el) => (sectionRefs.current['cta'] = el)}
          className="py-20 sm:py-28 lg:py-32 bg-[#030d1a] relative overflow-hidden"
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/10 blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-sky-600/15 blur-[100px]" />
          </div>
          <div className={`relative z-10 max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 text-center transition-all duration-700 ${visibleSections.has('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
              Mulai Digitalisasi<br className="hidden sm:block" /> Posyandu Anda Hari Ini
            </h2>
            <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
              Bergabunglah dan jadikan posyandu Anda lebih cerdas, efisien, dan berdampak bagi jutaan balita Indonesia.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register"
                className="group px-10 py-4 bg-gradient-to-r from-teal-500 to-sky-600 text-white font-bold text-base rounded-2xl hover:shadow-2xl hover:shadow-teal-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2">
                Daftar Gratis Sekarang
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login"
                className="px-10 py-4 border border-white/15 text-white font-semibold text-base rounded-2xl hover:bg-white/8 hover:border-white/30 transition-all duration-300 flex items-center justify-center backdrop-blur-sm">
                Sudah Punya Akun? Masuk
              </Link>
            </div>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            FOOTER
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <footer className="bg-[#020c17] text-white py-12 sm:py-16 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl overflow-hidden">
                    <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-base font-bold">Growell</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Platform digital pemantauan gizi balita berbasis AI untuk posyandu modern Indonesia.
                </p>
              </div>
              {[
                { title: 'Platform', links: ['Prediksi Gizi AI', 'Monitoring Pertumbuhan', 'Konsultasi Ahli Gizi', 'Laporan Digital'] },
                { title: 'Untuk', links: ['Kader Posyandu', 'Orang Tua', 'Ahli Gizi', 'Kelurahan / Puskesmas'] },
                { title: 'Dukungan', links: ['Pusat Bantuan', 'Hubungi Kami', 'Kebijakan Privasi', 'Syarat & Ketentuan'] },
              ].map(col => (
                <div key={col.title}>
                  <h4 className="text-sm font-semibold text-white mb-4">{col.title}</h4>
                  <ul className="space-y-2.5">
                    {col.links.map(l => (
                      <li key={l}><a href="#" className="text-gray-500 hover:text-teal-400 transition-colors text-sm">{l}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600">
              <span>&copy; 2025 Growell Indonesia. All rights reserved.</span>
              <div className="flex items-center gap-1.5 text-gray-600">
                <span>Dibuat dengan</span>
                <span className="text-red-400">â™¥</span>
                <span>untuk balita Indonesia</span>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
