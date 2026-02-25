'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login gagal');
      const role = data.user.role;
      if (role === 'orang_tua') router.push('/orang-tua');
      else if (role === 'ahli_gizi') router.push('/konsultasi');
      else if (role === 'kelurahan' || role === 'puskesmas') router.push('/kelurahan');
      else router.push('/kader');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex page-enter">
      {/* Left panel — Brand visual */}
      <div className="hidden lg:flex lg:w-[45%] bg-gray-950 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[120px] animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[320px] h-[320px] bg-sky-600/10 rounded-full blur-[100px] animate-float-slow-reverse" />
          <div className="absolute top-[15%] right-[10%] w-[200px] h-[200px] bg-violet-500/[0.06] rounded-full blur-[80px] animate-float-slow" />
          <div className="absolute inset-0 bg-hero-grid opacity-[0.03]" />
        </div>
        <div className="relative z-10 max-w-md">
          <Link href="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="/growell-logo.png" alt="Growell" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Growell</span>
          </Link>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight mb-5">
            Selamat datang<br />kembali.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Platform monitoring gizi balita berbasis AI — prediksi akurat, intervensi cepat, data real-time.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 stagger-grid">
            {[{ v: '83+', l: 'Variabel Analisis' }, { v: '3', l: 'Model AI' }, { v: '100%', l: 'Terenkripsi' }].map((s, i) => (
              <div key={i} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-500">
                <div className="text-xl font-bold text-white count-up">{s.v}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-16 py-12 bg-white">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/growell-logo.png" alt="Growell" className="w-9 h-9 rounded-xl object-cover" />
              <span className="text-xl font-extrabold text-gray-900">Growell</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Masuk</h1>
            <p className="text-gray-500">Masukkan email dan kata sandi Anda.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all text-gray-900 text-sm placeholder:text-gray-400"
                placeholder="nama@email.com" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Kata Sandi</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} id="password" name="password" value={formData.password} onChange={handleChange} required
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-400/10 outline-none transition-all text-gray-900 text-sm pr-12 placeholder:text-gray-400"
                  placeholder="Masukkan kata sandi" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-sky-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-teal-500/25 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                  Memproses...
                </span>
              ) : (
                <>Masuk <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative flex items-center">
              <div className="flex-1 border-t border-gray-100"></div>
              <span className="px-4 text-xs text-gray-400 uppercase tracking-wider">atau</span>
              <div className="flex-1 border-t border-gray-100"></div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Belum punya akun?{' '}
            <Link href="/register" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
              Daftar Sekarang
            </Link>
          </p>

          <Link href="/" className="mt-8 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors font-medium group">
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" /> Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
